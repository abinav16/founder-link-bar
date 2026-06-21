import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/widget/click")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const host = url.searchParams.get("host");
        if (!id) return new Response("Missing id", { status: 400 });

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const { data: s } = await supabase
          .from("startups")
          .select("website_url, status")
          .eq("id", id)
          .maybeSingle();

        if (!s || s.status !== "approved") return new Response("Not found", { status: 404 });

        await supabase.from("clicks").insert({
          shown_startup_id: id,
          host_startup_id: host ?? null,
        });

        return new Response(null, {
          status: 302,
          headers: { Location: s.website_url, "Cache-Control": "no-store" },
        });
      },
    },
  },
});
