import { createFileRoute } from "@tanstack/react-router";

// Heartbeat endpoint: records widget visibility for admin observability only.
// No emails, no automatic status changes, no bans — all escalation is manual
// via the admin panel to avoid false positives from transient overlays.

export const Route = createFileRoute("/api/public/widget/heartbeat")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Cache-Control": "no-store",
        };

        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const visible = url.searchParams.get("visible") === "true";

        if (!id) return new Response(null, { status: 400, headers: cors });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: startup, error } = await supabaseAdmin
            .from("startups")
            .select("id, widget_hidden_at, banned")
            .eq("id", id)
            .maybeSingle();

          if (error || !startup) return new Response(null, { status: 404, headers: cors });
          if (startup.banned) return new Response(null, { status: 403, headers: cors });

          const now = new Date();

          // Bookkeeping only. Never mutate status, never send email.
          await supabaseAdmin
            .from("startups")
            .update({
              widget_currently_visible: visible,
              widget_last_heartbeat_at: now.toISOString(),
              widget_hidden_at: visible
                ? null
                : (startup.widget_hidden_at ?? now.toISOString()),
            })
            .eq("id", id);

          return new Response(null, { status: 200, headers: cors });
        } catch {
          return new Response(null, { status: 500, headers: cors });
        }
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
          },
        }),
    },
  },
});
