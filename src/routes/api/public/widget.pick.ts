import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/widget/pick")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const host = url.searchParams.get("host");
        const domain = url.searchParams.get("domain");

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } }
        );

        let query = supabase
          .from("startups")
          .select("id, name, website_url, description")
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

        const pick = filtered[Math.floor(Math.random() * filtered.length)];
        return Response.json(pick, {
          headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
        });
      },
    },
  },
});
