import { createServerFn } from "@tanstack/react-start";

export interface LeaderboardRow {
  id: string;
  name: string;
  website_url: string;
  description: string;
  impressions: number;
  clicks: number;
}

export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: startups, error } = await supabaseAdmin
    .from("startups")
    .select("id, name, website_url, description")
    .eq("status", "approved");

  if (error) throw error;

  const rows = await Promise.all(
    (startups ?? []).map(async (startup) => {
      const [{ count: impressions }, { count: clicks }] = await Promise.all([
        supabaseAdmin
          .from("impressions")
          .select("*", { count: "exact", head: true })
          .eq("shown_startup_id", startup.id),
        supabaseAdmin
          .from("clicks")
          .select("*", { count: "exact", head: true })
          .eq("shown_startup_id", startup.id),
      ]);

      return {
        ...startup,
        impressions: impressions ?? 0,
        clicks: clicks ?? 0,
      } satisfies LeaderboardRow;
    }),
  );

  rows.sort((a, b) => b.impressions - a.impressions);

  return { rows };
});
