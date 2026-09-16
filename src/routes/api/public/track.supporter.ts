import { createFileRoute } from "@tanstack/react-router";
import { parseUA, extractCountry, extractIp, lookupCountry } from "@/lib/ua";

/**
 * Supporter tracking beacon.
 *
 * Supporter listings pay instead of showing the bar. They may optionally paste
 * a tracking-only snippet, which renders nothing and reports the same anonymous
 * signals the widget already reports (country, device, referrer, path). Those
 * rows land in `site_visits` — never in `impressions` — so a supporter site can
 * never appear as an impression host or inflate network numbers.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
};

function hostOf(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/track/supporter")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return new Response(null, { status: 400, headers: CORS });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: startup } = await supabaseAdmin
            .from("startups")
            .select("id, website_url, banned, membership_mode, supporter_until")
            .eq("id", id)
            .maybeSingle();

          if (!startup || startup.banned) return new Response(null, { status: 404, headers: CORS });

          // Same-domain check as the heartbeat: reject a wrong host, soft-pass
          // when the browser sends no origin at all.
          const expectedHost = hostOf(startup.website_url);
          const originHost =
            hostOf(request.headers.get("origin")) ?? hostOf(request.headers.get("referer"));
          if (originHost && expectedHost) {
            const matches = originHost === expectedHost || originHost.endsWith(`.${expectedHost}`);
            if (!matches) return new Response(null, { status: 403, headers: CORS });
          }

          const ua = request.headers.get("user-agent") ?? "";
          const { device, os, browser } = parseUA(ua);
          let country = extractCountry(request);
          if (!country) country = await lookupCountry(extractIp(request));

          const rawPath = url.searchParams.get("path");
          const path = rawPath && rawPath.startsWith("/") ? rawPath.slice(0, 200) : null;
          const rawRef = url.searchParams.get("ref");
          let referrer = rawRef ? rawRef.slice(0, 500) : null;
          // StartupBar-attributed landings get bucketed like everywhere else.
          if (path && (path.includes("utm_source=startupbar") || path.includes("_sbvia="))) {
            referrer = "startupbar";
          }
          const sid = url.searchParams.get("sid");

          await supabaseAdmin.from("site_visits").insert({
            startup_id: id,
            country: country ? country.toUpperCase() : null,
            device,
            os,
            browser,
            referrer,
            path,
            session_id: sid ? sid.slice(0, 64) : null,
          } as never);

          // Unlock signal for the dashboard: the snippet is live on their site.
          await supabaseAdmin
            .from("startups")
            .update({ tracking_last_seen_at: new Date().toISOString() } as never)
            .eq("id", id);

          return new Response(null, { status: 204, headers: CORS });
        } catch {
          return new Response(null, { status: 500, headers: CORS });
        }
      },
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
    },
  },
});
