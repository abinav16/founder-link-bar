import { createFileRoute } from "@tanstack/react-router";

// Heartbeat endpoint: records widget visibility for admin observability only.
// No emails, no automatic status changes, no bans — all escalation is manual
// via the admin panel to avoid false positives from transient overlays.

function hostOf(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

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
            .select("id, widget_hidden_at, banned, website_url")
            .eq("id", id)
            .maybeSingle();

          if (error || !startup) return new Response(null, { status: 404, headers: cors });
          if (startup.banned) return new Response(null, { status: 403, headers: cors });

          // Verify the heartbeat originates from the startup's registered
          // domain (or a subdomain of it — startups often install the widget
          // on app.example.com while registering example.com). Raises the
          // bar against cross-startup visibility spoofing without breaking
          // real installs.
          //
          // If Origin/Referer are absent (strict Referrer-Policy, no-referrer
          // meta, etc.) we soft-pass: this endpoint is bookkeeping only, and
          // a false negative here would show compliant widgets as "hidden"
          // to the admin. Only reject when a *wrong* host IS present.
          const expectedHost = hostOf(startup.website_url);
          const originHost = hostOf(request.headers.get("origin")) ?? hostOf(request.headers.get("referer"));
          if (originHost && expectedHost) {
            const matches = originHost === expectedHost || originHost.endsWith(`.${expectedHost}`);
            if (!matches) return new Response(null, { status: 403, headers: cors });
          }


          const now = new Date();

          // Compose the last-seen URL (origin from validated referer/origin +
          // path from the loader). Purely for admin observability — we only
          // store it when we already trust the origin.
          let lastPageUrl: string | null = null;
          try {
            const rawPath = url.searchParams.get("path");
            const originHeader = request.headers.get("origin") ?? request.headers.get("referer");
            if (rawPath && rawPath.startsWith("/") && originHeader) {
              const originUrl = new URL(originHeader);
              const safePath = rawPath.slice(0, 200).replace(/[\s<>"']/g, "");
              lastPageUrl = `${originUrl.protocol}//${originUrl.host}${safePath}`;
              if (lastPageUrl.length > 300) lastPageUrl = lastPageUrl.slice(0, 300);
            }
          } catch {
            lastPageUrl = null;
          }

          // Bookkeeping only. Never mutate status, never send email.
          await supabaseAdmin
            .from("startups")
            .update({
              widget_currently_visible: visible,
              widget_last_heartbeat_at: now.toISOString(),
              widget_hidden_at: visible
                ? null
                : (startup.widget_hidden_at ?? now.toISOString()),
              ...(lastPageUrl ? { widget_last_page_url: lastPageUrl } : {}),
            } as never)
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
