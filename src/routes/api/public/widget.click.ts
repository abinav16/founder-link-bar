import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isApprovedHost } from "@/lib/host-check";
import { isBotRequest, isOverHostCap } from "@/lib/bot-filter";
import { randomReferralToken, sha256 } from "@/lib/signup-tracking";

const STARTUPBAR_SITE_ID = "0d2db708-f4e9-4b77-bd83-c446826c76b1";

export const Route = createFileRoute("/api/public/widget/click")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const host = url.searchParams.get("host");
        const source = url.searchParams.get("source");
        const via = url.searchParams.get("via");
        const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient<Database>(process.env.SUPABASE_URL!, key, { auth: { storage: undefined, persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const h = new Headers(init?.headers); h.set('apikey',key); if (key.startsWith('sb_')) h.delete('Authorization'); return fetch(input,{...init,headers:h}); } } });

        // Clicks only count when the host site is an approved member (or the
        // click came from StartupBar's own pages, where there is no host id).
        const hostOk =
          (await isApprovedHost(supabase, host)) &&
          !isBotRequest(request) &&
          !(await isOverHostCap(supabase, host, "clicks"));
        const hostId = hostOk ? (host ?? null) : null;

        // Badge click: not tied to a specific promoted startup — record against
        // the StartupBar site itself so it shows up as widget-sourced traffic.
        if (source === "badge") {
          if (hostOk) {
            await supabase.from("clicks").insert({ shown_startup_id: STARTUPBAR_SITE_ID, host_startup_id: hostId });
          }
          const dest = new URL("https://startupbar.co/");

          dest.searchParams.set("utm_source", "startupbar");
          dest.searchParams.set("utm_medium", "badge");
          dest.searchParams.set("utm_campaign", "network");
          if (via) dest.searchParams.set("_sbvia", via.slice(0, 200));
          return new Response(null, { status: 302, headers: { Location: dest.toString(), "Cache-Control": "no-store" } });
        }

        if (!id) return new Response("Missing id", { status: 400 });
        const { data: s } = await supabase.from("startups").select("website_url, status").eq("id", id).maybeSingle();
        if (!s || s.status !== "approved") return new Response("Not found", { status: 404 });

        let dest: URL;
        try { dest = new URL(s.website_url); } catch { return new Response("Invalid destination", { status: 400 }); }
        if (dest.protocol !== "https:" && dest.protocol !== "http:") return new Response("Invalid destination", { status: 400 });

        if (source !== "preview" && hostOk) {
          await supabase.from("clicks").insert({ shown_startup_id: id, host_startup_id: hostId });
        }


        dest.searchParams.set("utm_source", "startupbar");
        const medium =
          source === "dashboard" ? "dashboard"
          : source === "profile" ? "profile"
          : source === "preview" ? "preview"
          : source === "featured" ? "featured"
          : "bar";
        const campaign =
          source === "dashboard" ? "dashboard"
          : source === "profile" || source === "preview" ? "profile"
          : source === "featured" ? "sponsored"
          : "network";
        dest.searchParams.set("utm_medium", medium);
        dest.searchParams.set("utm_campaign", campaign);
        if (via) dest.searchParams.set("_sbvia", via.slice(0, 200));
        // Only genuine approved partner-host clicks can mint attribution.
        // Fail closed for proof, but fail open for navigation on tracking errors.
        if (host && source !== 'preview' && source !== 'dashboard' && source !== 'profile' && hostOk && host !== id) {
          try {
            const { data: approved } = await supabase.rpc('is_approved_host', { _id: host });
            const { data: targetApproved } = await supabase.rpc('is_approved_host', { _id: id });
            const { data: config } = await supabase.rpc('signup_tracking_public', { _startup_id: id });
            if (approved === true && targetApproved === true && config && typeof config === 'object' && !Array.isArray(config) && config.enabled === true) {
              const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
              const token = randomReferralToken();
              const { error } = await supabaseAdmin.from('signup_referrals').insert({ startup_id: id, host_startup_id: host, token_hash: await sha256(token) });
              if (!error) dest.searchParams.set('_sbref', token);
            }
          } catch { /* Attribution failure must never break the partner visit. */ }
        }
        return new Response(null, { status: 302, headers: { Location: dest.toString(), "Cache-Control": "no-store" } });
      },
    },
  },
});

