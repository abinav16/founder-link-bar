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
        // Accept both the live and test webhook secrets so the same endpoint
        // can fulfil events from either Dodo environment.
        const secrets = [
          process.env.DODO_WEBHOOK_SECRET,
          process.env.DODO_TEST_WEBHOOK_SECRET,
        ].filter((s): s is string => Boolean(s));
        if (secrets.length === 0) {
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

        const valid = secrets.some((s) =>
          verifyDodoSignature(rawBody, id, timestamp, signature, s),
        );
        if (!valid) {
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
        const status: string = String(data.status ?? "").toLowerCase();
        const customerEmail: string = String(data.customer?.email ?? "").toLowerCase();
        const metaUserId: string | undefined = data.metadata?.user_id;

        // Featured slots are sold as a Dodo subscription, so the stable id for
        // those events is subscription_id; one-time listings use payment_id.
        const isSubscriptionEvent =
          type.startsWith("subscription.") || Boolean(data.subscription_id);
        const subscriptionId: string | undefined = data.subscription_id ??
          (type.startsWith("subscription.") ? data.id : undefined);
        const paymentId: string | undefined = isSubscriptionEvent
          ? subscriptionId
          : (data.payment_id ?? data.id);

        if (!paymentId) {
          return new Response("ok", { status: 200 });
        }

        // Renewal charges arrive as payment/subscription events on an existing
        // subscription — they extend the term instead of creating a new slot.
        const isRenewal = type === "subscription.renewed" ||
          (isSubscriptionEvent && (type === "payment.succeeded" || type === "payment.completed"));

        // Subscription ended or was cancelled at the provider: reflect it here.
        const isCancelEvent =
          type === "subscription.cancelled" ||
          type === "subscription.canceled" ||
          type === "subscription.expired" ||
          status === "cancelled" ||
          status === "canceled" ||
          status === "expired";
        if (isSubscriptionEvent && isCancelEvent) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const endsNow = type === "subscription.expired" || status === "expired";

          // Supporter memberships live on the startup row. Cancelling only
          // turns off auto-renewal; the term keeps running until it expires,
          // and only then does the listing revert to widget mode.
          const { data: supporterRows } = await supabaseAdmin
            .from("startups")
            .select("id")
            .eq("supporter_subscription_id", paymentId);
          if (supporterRows && supporterRows.length > 0) {
            await supabaseAdmin
              .from("startups")
              .update(
                (endsNow
                  ? {
                      supporter_cancel_at_period_end: true,
                      supporter_until: new Date().toISOString(),
                      membership_mode: "widget",
                    }
                  : { supporter_cancel_at_period_end: true }) as never,
              )
              .eq("supporter_subscription_id", paymentId);
            return new Response("ok", { status: 200 });
          }

          await supabaseAdmin
            .from("featured_slots")
            .update(
              endsNow
                ? { status: "expired", cancel_at_period_end: true, cancelled_at: new Date().toISOString() }
                : { cancel_at_period_end: true, cancelled_at: new Date().toISOString() },
            )
            .eq("dodo_payment_id", paymentId);
          return new Response("ok", { status: 200 });
        }

        // Only act on succeeded payments / active subscriptions.
        const isSucceeded =
          status === "succeeded" ||
          status === "active" ||
          type === "payment.succeeded" ||
          type === "payment.completed" ||
          type === "subscription.active" ||
          type === "subscription.renewed";
        if (!isSucceeded) {
          return new Response("ok", { status: 200 });
        }

        // StartupBid payments are guest-friendly: no user account required.
        if (data.metadata?.kind === "bid" && data.metadata?.bid_id) {
          const { fulfilBid } = await import("@/lib/bid-fulfil.server");
          await fulfilBid(
            String(data.metadata.bid_id),
            paymentId,
            customerEmail ?? null,
            Number(data?.total_amount ?? data?.settlement_amount) || null,
          );
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

        // Supporter memberships: an annual subscription that replaces showing
        // the bar. Sets the listing's mode and term on the startup row.
        if (data.metadata?.kind === "supporter") {
          const startupId: string | null = data.metadata?.startup_id ?? null;
          if (!startupId) return new Response("ok", { status: 200 });

          const { data: row } = await supabaseAdmin
            .from("startups")
            .select("id, supporter_until, supporter_subscription_id")
            .eq("id", startupId)
            .eq("user_id", userId)
            .maybeSingle();
          if (!row) return new Response("ok", { status: 200 });

          const current = row.supporter_until ? new Date(row.supporter_until).getTime() : 0;
          const alreadyFulfilled = row.supporter_subscription_id === paymentId;
          // First purchase starts a year from now; a renewal extends from the
          // later of "now" and the current end date so nothing is lost.
          if (alreadyFulfilled && !isRenewal) return new Response("ok", { status: 200 });
          const from = Math.max(current, Date.now());

          await supabaseAdmin
            .from("startups")
            .update({
              membership_mode: "supporter",
              supporter_until: new Date(from + 365 * 86_400_000).toISOString(),
              supporter_subscription_id: paymentId,
              supporter_cancel_at_period_end: false,
            } as never)
            .eq("id", startupId);

          return new Response("ok", { status: 200 });
        }

        // Featured-slot purchases fulfil a sidebar booking instead of a listing credit.
        if (data.metadata?.kind === "featured" || isSubscriptionEvent) {
          const slotIndex = Number(data.metadata?.slot_index);
          const startupId: string | null = data.metadata?.startup_id ?? null;

          // Idempotent: this subscription may already have been fulfilled.
          const { data: existing } = await supabaseAdmin
            .from("featured_slots")
            .select("id, expires_at, cancel_at_period_end")
            .eq("dodo_payment_id", paymentId)
            .maybeSingle();
          if (existing) {
            if (isRenewal && !existing.cancel_at_period_end) {
              // Extend the term by another 30 days from whichever is later.
              const cur = existing.expires_at ? new Date(existing.expires_at).getTime() : 0;
              const from = Math.max(cur, Date.now());
              await supabaseAdmin
                .from("featured_slots")
                .update({
                  status: "active",
                  expires_at: new Date(from + 30 * 86_400_000).toISOString(),
                })
                .eq("id", existing.id);
            }
            return new Response("ok", { status: 200 });
          }


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
