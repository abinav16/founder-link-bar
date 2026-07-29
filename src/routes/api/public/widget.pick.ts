import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { parseUA, extractCountry, extractIp, lookupCountry } from "@/lib/ua";

export const Route = createFileRoute("/api/public/widget/pick")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const host = url.searchParams.get("host");
        const domain = url.searchParams.get("domain");
        const preview = url.searchParams.get("preview") === "true";
        const sbref = url.searchParams.get("sbref");
        const pref = url.searchParams.get("pref");
        const pathParam = url.searchParams.get("path");

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } }
        );

        let query = supabase
          .from("startups")
          .select("id, name, website_url, description, logo_url")
          .eq("status", "approved");

        if (host) query = query.neq("id", host);

        const { data, error } = await query;
        if (error || !data || data.length === 0) {
          return Response.json(null, {
            headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
          });
        }

        const filtered = domain
          ? data.filter(s => !s.website_url?.toLowerCase().includes(domain.toLowerCase()))
          : data;

        if (filtered.length === 0) {
          return Response.json(null, {
            headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
          });
        }

        // Reciprocity-weighted delivery: startups that send more impressions
        // into the network get shown proportionally more often (capped at 4x),
        // while small/new startups keep a guaranteed 1x baseline.
        const weights = await getPickWeights(supabase);
        const pick = weightedPick(filtered, weights);

        if (!preview) {
          // Enrich impression with visitor context so the per-startup
          // dashboard globe can show real referrer/country/device instead
          // of falling back to "Direct" / "Unknown".
          const ua = request.headers.get("user-agent") ?? "";
          const { device, os, browser } = parseUA(ua);

          let country = extractCountry(request);
          if (!country) country = await lookupCountry(extractIp(request));

          // Referrer priority: sbref (utm_source=startupbar outbound) wins so
          // it lands in the "StartupBar" bucket; otherwise raw document.referrer
          // from the host page (browser Referer for network/leaderboard clicks
          // and organic referrers alike).
          const referrer = sbref
            ? (sbref.length > 500 ? sbref.slice(0, 500) : sbref)
            : (pref ? (pref.length > 500 ? pref.slice(0, 500) : pref) : null);

          const path = pathParam && pathParam.startsWith("/")
            ? pathParam.slice(0, 200)
            : null;

          await supabase.from("impressions").insert({
            shown_startup_id: pick.id,
            host_startup_id: host ?? null,
            referrer,
            country: country ? country.toUpperCase() : null,
            device,
            os,
            browser,
            path,
          });
        }

        return Response.json(pick, {
          headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
        });
      },
    },
  },
});
