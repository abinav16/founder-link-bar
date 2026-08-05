import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isApprovedHost } from "@/lib/host-check";

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
        const supabase = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } });

        // Badge click: not tied to a specific promoted startup — record against
        // the StartupBar site itself so it shows up as widget-sourced traffic.
        if (source === "badge") {
          await supabase.from("clicks").insert({ shown_startup_id: STARTUPBAR_SITE_ID, host_startup_id: host ?? null });
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

        if (source !== "preview") {
          await supabase.from("clicks").insert({ shown_startup_id: id, host_startup_id: host ?? null });
        }

        dest.searchParams.set("utm_source", "startupbar");
        const medium = source === "dashboard" ? "dashboard" : source === "profile" ? "profile" : source === "preview" ? "preview" : "bar";
        const campaign = source === "dashboard" ? "dashboard" : source === "profile" || source === "preview" ? "profile" : "network";
        dest.searchParams.set("utm_medium", medium);
        dest.searchParams.set("utm_campaign", campaign);
        if (via) dest.searchParams.set("_sbvia", via.slice(0, 200));
        return new Response(null, { status: 302, headers: { Location: dest.toString(), "Cache-Control": "no-store" } });
      },
    },
  },
});

