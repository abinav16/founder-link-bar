import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { parseUA, extractCountry, extractIp, lookupCountry } from "@/lib/ua";

// The StartupBar marketing site is represented as an approved startup row so
// that pageview impressions satisfy the impressions RLS policy and show up on
// the network-wide "live activity" globe on the homepage.
const STARTUPBAR_SITE_ID = "0d2db708-f4e9-4b77-bd83-c446826c76b1";


async function lookupCountry(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  try {
    const res = await fetch(`https://ipapi.co/${ip}/country/`, {
      headers: { "User-Agent": "startupbar-site-tracker" },
    });
    if (!res.ok) return null;
    const txt = (await res.text()).trim();
    return /^[A-Z]{2}$/.test(txt) ? txt : null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/track/site-visit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const path = typeof body?.path === "string" ? body.path.slice(0, 500) : "/";
          const referrer = typeof body?.referrer === "string" ? body.referrer.slice(0, 500) : null;

          const ua = request.headers.get("user-agent") ?? "";
          const { device, os, browser } = parseUA(ua);

          // Country: Cloudflare header first, else IP lookup fallback
          let country = request.headers.get("cf-ipcountry");
          if (country === "XX" || country === "T1") country = null;
          if (!country) {
            const ip =
              request.headers.get("cf-connecting-ip") ||
              request.headers.get("x-real-ip") ||
              (request.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
              null;
            country = await lookupCountry(ip);
          }

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
