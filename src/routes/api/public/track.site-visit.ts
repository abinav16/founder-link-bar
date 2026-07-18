import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { parseUA, extractCountry, extractIp, lookupCountry } from "@/lib/ua";

// The StartupBar marketing site is represented as an approved startup row so
// that pageview impressions satisfy the impressions RLS policy and show up on
// the network-wide "live activity" globe on the homepage.
const STARTUPBAR_SITE_ID = "0d2db708-f4e9-4b77-bd83-c446826c76b1";


export const Route = createFileRoute("/api/public/track/site-visit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const path = typeof body?.path === "string" ? body.path.slice(0, 500) : "/";
          let referrer = typeof body?.referrer === "string" ? body.referrer.slice(0, 500) : null;

          // If the landing URL carries StartupBar attribution (utm_source=startupbar
          // or _sbvia=<host>), override referrer so the homepage globe classifies
          // the visit as StartupBar network traffic instead of Direct.
          try {
            const qIdx = path.indexOf("?");
            if (qIdx >= 0) {
              const sp = new URLSearchParams(path.slice(qIdx + 1));
              const utm = sp.get("utm_source");
              const via = sp.get("_sbvia");
              if (utm === "startupbar" || via) {
                referrer = via ? `startupbar:${via.slice(0, 200)}` : "startupbar";
              }
            }
          } catch {}

          const ua = request.headers.get("user-agent") ?? "";
          const { device, os, browser } = parseUA(ua);

          let country = extractCountry(request);
          if (!country) country = await lookupCountry(extractIp(request));


          const supabase = createClient<Database>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } }
          );

          await supabase.from("impressions").insert({
            shown_startup_id: STARTUPBAR_SITE_ID,
            host_startup_id: null,
            country: country ? country.toUpperCase() : null,
            device,
            os,
            browser,
            referrer,
            path,
          });

          return Response.json(
            { ok: true },
            { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } }
          );
        } catch (err) {
          return Response.json(
            { ok: false, error: String(err) },
            { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
          );
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
