import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Resend delivery-event webhook.
 *
 * Hard bounces and spam complaints are written straight into
 * `suppressed_emails`, so the next broadcast never touches them again.
 * Resend signs webhooks with Svix headers; we verify before trusting anything.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function verifySvix(secret: string, id: string, timestamp: string, signatureHeader: string, body: string): boolean {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  const expectedBuf = Buffer.from(expected);
  for (const part of signatureHeader.split(" ")) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    const given = Buffer.from(sig);
    if (given.length === expectedBuf.length && timingSafeEqual(given, expectedBuf)) return true;
  }
  return false;
}

// Only permanent failures suppress. Soft bounces (mailbox full, throttled)
// come back as bounce_type "Transient" and must stay on the list.
function suppressionReason(event: string, payload: Record<string, unknown>): "bounce" | "complaint" | null {
  if (event === "email.complained") return "complaint";
  if (event === "email.bounced") {
    const bounce = (payload["bounce"] ?? {}) as Record<string, unknown>;
    const type = String(bounce["type"] ?? "").toLowerCase();
    if (type && type !== "hard" && type !== "permanent") return null;
    return "bounce";
  }
  return null;
}

export const Route = createFileRoute("/api/public/email-events")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: cors }),

      POST: async ({ request }) => {
        const secret = process.env["RESEND_WEBHOOK_SECRET"];
        if (!secret) {
          return Response.json({ error: "Webhook not configured" }, { status: 503, headers: cors });
        }

        const body = await request.text();
        const id = request.headers.get("svix-id") ?? "";
        const timestamp = request.headers.get("svix-timestamp") ?? "";
        const signature = request.headers.get("svix-signature") ?? "";
        if (!id || !timestamp || !signature || !verifySvix(secret, id, timestamp, signature, body)) {
          return Response.json({ error: "Invalid signature" }, { status: 401, headers: cors });
        }

        // Reject replays older than 5 minutes.
        const age = Math.abs(Date.now() / 1000 - Number(timestamp));
        if (!Number.isFinite(age) || age > 300) {
          return Response.json({ error: "Stale signature" }, { status: 401, headers: cors });
        }

        let parsed: { type?: string; data?: Record<string, unknown> };
        try {
          parsed = JSON.parse(body);
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: cors });
        }

        const event = String(parsed.type ?? "");
        const payload = parsed.data ?? {};
        const reason = suppressionReason(event, payload);

        const rawTo = payload["to"];
        const emails = (Array.isArray(rawTo) ? rawTo : [rawTo])
          .filter((v): v is string => typeof v === "string" && v.includes("@"))
          .map((v) => v.trim().toLowerCase());

        if (!reason || emails.length === 0) {
          return Response.json({ ok: true, suppressed: 0 }, { headers: cors });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("suppressed_emails").upsert(
          emails.map((email) => ({
            email,
            reason,
            metadata: { event, provider: "resend", email_id: payload["email_id"] ?? null },
          })),
          { onConflict: "email", ignoreDuplicates: true },
        );

        // Reflect the outcome on the send log when we can match the address.
        await supabaseAdmin
          .from("email_send_log")
          .update({ status: reason === "bounce" ? "bounced" : "complained", error_message: event })
          .in("recipient_email", emails)
          .eq("status", "sent");

        return Response.json({ ok: true, suppressed: emails.length }, { headers: cors });
      },
    },
  },
});
