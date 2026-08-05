import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { parseUA, extractCountry, extractIp, lookupCountry } from "@/lib/ua";
import { getPickWeights, weightedPick } from "@/lib/pick-weights";
import { isApprovedHost } from "@/lib/host-check";

const STARTUPBAR_SITE_ID = "0d2db708-f4e9-4b77-bd83-c446826c76b1";


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

        // Non-members (rejected/pending/banned) with the script still installed
        // get StartupBar's own listing instead of the generic banner — shown,
        // but never counted as an impression.
        if (!preview && !(await isApprovedHost(supabase, host))) {
          const { data: self } = await supabase
            .from("startups")
            .select("id, name, website_url, description, logo_url")
            .eq("id", STARTUPBAR_SITE_ID)
            .eq("status", "approved")
            .maybeSingle();
          return Response.json(self ?? null, {
            headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
          });
        }



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

          // Dedupe: one impression per visitor session per shown startup.
          // Repeat pageviews still render the bar, they just don't inflate
          // the impression count (which was crushing reported CTR).
          const sid = url.searchParams.get("sid");
          let alreadyCounted = false;
          if (sid) {
            const { data: existing } = await supabase
              .from("impressions")
              .select("id")
              .eq("session_id", sid.slice(0, 64))
              .eq("shown_startup_id", pick.id)
              .limit(1);
            alreadyCounted = !!existing && existing.length > 0;
          }

          if (!alreadyCounted) {
            await supabase.from("impressions").insert({
              shown_startup_id: pick.id,
              host_startup_id: host ?? null,
              referrer,
              country: country ? country.toUpperCase() : null,
              device,
              os,
              browser,
              path,
              session_id: sid ? sid.slice(0, 64) : null,
            });
          }
        }

        return Response.json(pick, {
          headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
        });
      },
    },
  },
});
