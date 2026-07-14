import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const Route = createFileRoute("/api/public/unsubscribe")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: cors }),

      // Validate token → returns { email, unsubscribed }
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = (url.searchParams.get("token") ?? "").trim();
        if (!token) {
          return Response.json({ error: "Missing token" }, { status: 400, headers: cors });
        }
        const supabase = await getAdmin();
        const { data: tokenRow } = await supabase
          .from("email_unsubscribe_tokens")
          .select("email")
          .eq("token", token)
          .maybeSingle();
        if (!tokenRow) {
          return Response.json({ error: "Invalid token" }, { status: 404, headers: cors });
        }
        const email = (tokenRow.email as string).toLowerCase();
        const { data: sup } = await supabase
          .from("suppressed_emails")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        return Response.json({ email, unsubscribed: !!sup }, { headers: cors });
      },

      // Unsubscribe or resubscribe based on ?action=
      POST: async ({ request }) => {
        const url = new URL(request.url);
        let token = (url.searchParams.get("token") ?? "").trim();
        let action = (url.searchParams.get("action") ?? "unsubscribe").trim();
        let reasonCode = (url.searchParams.get("reason") ?? "").trim();
        let details = (url.searchParams.get("details") ?? "").trim();
        try {
          const body = await request.json().catch(() => null);
          if (body && typeof body === "object") {
            if (typeof body.token === "string") token = body.token.trim();
            if (typeof body.action === "string") action = body.action.trim();
            if (typeof body.reason === "string") reasonCode = body.reason.trim();
            if (typeof body.details === "string") details = body.details.trim();
          }
        } catch {
          /* form-encoded one-click POST has no JSON body */
        }
        if (!token) {
          return Response.json({ error: "Missing token" }, { status: 400, headers: cors });
        }

        const ALLOWED_REASONS = new Set([
          "too_many_emails",
          "not_relevant",
          "never_signed_up",
          "no_longer_interested",
          "content_quality",
          "other",
        ]);
        const normalizedReason = ALLOWED_REASONS.has(reasonCode) ? reasonCode : "unspecified";
        const trimmedDetails = details.slice(0, 500);

        const supabase = await getAdmin();
        const { data: tokenRow } = await supabase
          .from("email_unsubscribe_tokens")
          .select("email")
          .eq("token", token)
          .maybeSingle();
        if (!tokenRow) {
          return Response.json({ error: "Invalid token" }, { status: 404, headers: cors });
        }
        const email = (tokenRow.email as string).toLowerCase();

        if (action === "resubscribe") {
          await supabase.from("suppressed_emails").delete().eq("email", email).eq("reason", "unsubscribe");
          return Response.json({ email, unsubscribed: false }, { headers: cors });
        }

        // Idempotent unsubscribe (records reason on the fresh row)
        const { data: existing } = await supabase
          .from("suppressed_emails")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (!existing) {
          await supabase.from("suppressed_emails").insert({
            email,
            reason: "unsubscribe",
            metadata: {
              source: "user_one_click",
              token_hint: token.slice(0, 6),
              reason_code: normalizedReason,
              details: trimmedDetails || null,
              submitted_at: new Date().toISOString(),
            },
          });
        }
        await supabase
          .from("email_unsubscribe_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("token", token);
        return Response.json({ email, unsubscribed: true, reason_code: normalizedReason }, { headers: cors });
      },

    },
  },
});
