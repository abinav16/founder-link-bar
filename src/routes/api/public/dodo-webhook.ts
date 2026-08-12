import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Dodo Payments uses the standard-webhooks spec:
//   Headers: webhook-id, webhook-timestamp, webhook-signature
//   Signed payload: `${id}.${timestamp}.${rawBody}`
//   Signature format: "v1,<base64(hmac_sha256)>" (may be space-separated list)
//   Secret prefix "whsec_" is stripped and the remainder is base64-decoded to
//   the raw HMAC key.
function verifyDodoSignature(
  rawBody: string,
  id: string,
  timestamp: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!id || !timestamp || !signatureHeader || !secret) return false;
  const rawSecret = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  let keyBuf: Buffer;
  try {
    keyBuf = Buffer.from(rawSecret, "base64");
    if (keyBuf.length === 0) keyBuf = Buffer.from(rawSecret, "utf8");
  } catch {
    keyBuf = Buffer.from(rawSecret, "utf8");
  }
  const signed = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", keyBuf).update(signed).digest("base64");
  const expectedBuf = Buffer.from(expected);

  for (const part of signatureHeader.split(" ")) {
    const [, sig] = part.split(",");
    if (!sig) continue;
    const gotBuf = Buffer.from(sig);
    if (gotBuf.length === expectedBuf.length && timingSafeEqual(gotBuf, expectedBuf)) {
      return true;
    }
  }
  return false;
}

export const Route = createFileRoute("/api/public/dodo-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.DODO_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[dodo-webhook] Missing DODO_WEBHOOK_SECRET");
          return new Response("Server misconfigured", { status: 500 });
        }

        const rawBody = await request.text();
        const id = request.headers.get("webhook-id") ?? "";
        const timestamp = request.headers.get("webhook-timestamp") ?? "";
        const signature = request.headers.get("webhook-signature") ?? "";

        // Reject replays older than 5 minutes.
        const tsNum = Number(timestamp);
        if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
          return new Response("Stale timestamp", { status: 401 });
        }

        if (!verifyDodoSignature(rawBody, id, timestamp, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: any;
        try {
          event = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const type: string = event?.type ?? "";
        const data = event?.data ?? {};
        const paymentId: string | undefined = data.payment_id ?? data.id;
        const status: string = String(data.status ?? "").toLowerCase();
        const customerEmail: string = String(data.customer?.email ?? "").toLowerCase();
        const metaUserId: string | undefined = data.metadata?.user_id;

        if (!paymentId) {
          return new Response("ok", { status: 200 });
        }

        // Only act on succeeded payments. Ignore other event types (refunds, etc.).
        const isSucceeded =
          status === "succeeded" ||
          type === "payment.succeeded" ||
          type === "payment.completed";
        if (!isSucceeded) {
          return new Response("ok", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Resolve user_id from metadata first, then customer email.
        let userId: string | null = metaUserId ?? null;
        if (!userId && customerEmail) {
          const { data: authList } = await supabaseAdmin.auth.admin.listUsers();
          const match = authList?.users?.find(
            (u) => (u.email ?? "").toLowerCase() === customerEmail,
          );
          if (match) userId = match.id;
        }

        if (!userId) {
          console.error("[dodo-webhook] Cannot resolve user for", { paymentId, customerEmail });
          // Return 200 so Dodo doesn't hammer retries; log for manual recovery.
          return new Response("ok", { status: 200 });
        }

        // Featured-slot purchases fulfil a sidebar booking instead of a listing credit.
        if (data.metadata?.kind === "featured") {
          const slotIndex = Number(data.metadata?.slot_index);
          const startupId: string | null = data.metadata?.startup_id ?? null;

          // Idempotent: this payment may already have been fulfilled.
          const { data: existing } = await supabaseAdmin
            .from("featured_slots")
            .select("id")
            .eq("dodo_payment_id", paymentId)
            .maybeSingle();
          if (existing) return new Response("ok", { status: 200 });

          const nowIso = new Date().toISOString();
          const { data: active } = await supabaseAdmin
            .from("featured_slots")
            .select("slot_index")
            .eq("status", "active")
            .gt("expires_at", nowIso);
          const takenSlots = new Set((active ?? []).map((r) => r.slot_index));

          // Honour the requested slot; fall back to the first free one if it
          // was taken while the buyer was on the payment page.
          let finalSlot = Number.isInteger(slotIndex) ? slotIndex : 0;
          if (!finalSlot || takenSlots.has(finalSlot)) {
            finalSlot = [1, 2, 3, 4, 5, 6, 7, 8].find((i) => !takenSlots.has(i)) ?? 0;
          }
          if (!finalSlot) {
            console.error("[dodo-webhook] featured payment with no free slot", { paymentId });
            return new Response("ok", { status: 200 });
          }

          const expires = new Date(Date.now() + 30 * 86_400_000).toISOString();
          const { error: fErr } = await supabaseAdmin.from("featured_slots").insert({
            slot_index: finalSlot,
            startup_id: startupId,
            user_id: userId,
            dodo_payment_id: paymentId,
            status: "active",
            starts_at: nowIso,
            expires_at: expires,
          });
          if (fErr) {
            console.error("[dodo-webhook] featured_slots insert error", fErr);
            return new Response("DB error", { status: 500 });
          }
          return new Response("ok", { status: 200 });
        }

        // Idempotent upsert keyed by dodo_payment_id.
        const { error } = await supabaseAdmin
          .from("payments")
          .upsert(
            { user_id: userId, dodo_payment_id: paymentId, status: "succeeded" },
            { onConflict: "dodo_payment_id", ignoreDuplicates: false },
          );

        if (error) {
          console.error("[dodo-webhook] payments upsert error", error);
          return new Response("DB error", { status: 500 });
        }

        return new Response("ok", { status: 200 });

      },
    },
  },
});
