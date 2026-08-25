import { createFileRoute } from "@tanstack/react-router";

// Anonymous apply-funnel breadcrumbs. Writes go through the service-role
// client because application_events is admin-read / trigger-write only; the
// payload is deliberately limited to the funnel step and whatever the visitor
// already typed into the public form.
const ALLOWED = new Set(["apply_opened", "apply_step"]);

export const Route = createFileRoute("/api/public/track/funnel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const event = typeof body?.event === "string" ? body.event : "";
          if (!ALLOWED.has(event)) {
            return Response.json({ ok: false, error: "bad event" }, { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
          }

          const step = Number.isFinite(body?.step) ? Number(body.step) : null;
          const name = typeof body?.name === "string" ? body.name.slice(0, 120) : "";
          const url = typeof body?.url === "string" ? body.url.slice(0, 300) : null;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Resolve the signed-in founder (if any) from a verified bearer so
          // abandoned applications become a contactable audience.
          let userId: string | null = null;
          let userEmail: string | null = null;
          const authHeader = request.headers.get("authorization") ?? "";
          const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
          if (token) {
            try {
              const { data: authData } = await supabaseAdmin.auth.getUser(token);
              userId = authData?.user?.id ?? null;
              userEmail = authData?.user?.email ?? null;
            } catch {
              // ignore — stay anonymous
            }
          }

          const { error } = await supabaseAdmin.from("application_events").insert({
            startup_name: name || "(not entered)",
            website_url: url,
            event_type: event,
            applicant_user_id: userId,
            applicant_email: userEmail,
            metadata: { step },
          });
          if (error) {
            console.error("funnel insert failed", error);
            return Response.json({ ok: false, error: error.message }, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
          }


          return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } });
        } catch (err) {
          return Response.json({ ok: false, error: String(err) }, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
        }
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});
