import { createServerFn } from "@tanstack/react-start";

export interface LeaderboardRow {
  id: string;
  name: string;
  website_url: string;
  description: string;
  impressions: number;
  clicks: number;
  impressions_given: number;
  dailyImpressions: number[];
  dailyGiven: number[];
}

export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: startups, error } = await supabaseAdmin
    .from("startups")
    .select("id, name, website_url, description")
    .eq("status", "approved");

  if (error) throw error;

  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const { data: recentImps } = await supabaseAdmin
    .from("impressions")
    .select("shown_startup_id, host_startup_id, created_at")
    .gte("created_at", since.toISOString());

  function buildDailyBuckets(
    rows: typeof recentImps,
    field: "shown_startup_id" | "host_startup_id",
    startupId: string,
  ): number[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const counts = [0, 0, 0, 0, 0, 0, 0];
    (rows ?? []).forEach((r) => {
      if ((r as any)[field] !== startupId) return;
      const d = new Date(r.created_at);
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
      if (diff >= 0 && diff <= 6) counts[6 - diff]++;
    });
    return counts;
  }

  const rows = await Promise.all(
    (startups ?? []).map(async (startup) => {
      const [{ count: impressions }, { count: clicks }, { count: impressions_given }] = await Promise.all([
        supabaseAdmin
          .from("impressions")
          .select("*", { count: "exact", head: true })
          .eq("shown_startup_id", startup.id),
        supabaseAdmin
          .from("clicks")
          .select("*", { count: "exact", head: true })
          .eq("shown_startup_id", startup.id),
        supabaseAdmin
          .from("impressions")
          .select("*", { count: "exact", head: true })
          .eq("host_startup_id", startup.id),
      ]);

      return {
        ...startup,
        impressions: impressions ?? 0,
        clicks: clicks ?? 0,
        impressions_given: impressions_given ?? 0,
        dailyImpressions: buildDailyBuckets(recentImps, "shown_startup_id", startup.id),
        dailyGiven: buildDailyBuckets(recentImps, "host_startup_id", startup.id),
      } satisfies LeaderboardRow;
    }),
  );

  const rowsByReceived = [...rows].sort((a, b) => b.impressions - a.impressions);
  const rowsByGiven = [...rows].sort((a, b) => b.impressions_given - a.impressions_given);

  return { rowsByReceived, rowsByGiven };
});

export interface NetworkActivityResult {
  todayImpressions: number;
  todayClicks: number;
  yesterdayImpressions: number;
  yesterdayClicks: number;
}

export const getNetworkActivity = createServerFn({ method: "GET" }).handler(async (): Promise<NetworkActivityResult> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);

  const [ti, tc, yi, yc] = await Promise.all([
    supabaseAdmin.from("impressions").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    supabaseAdmin.from("clicks").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    supabaseAdmin.from("impressions").select("*", { count: "exact", head: true }).gte("created_at", yesterdayStart.toISOString()).lt("created_at", todayStart.toISOString()),
    supabaseAdmin.from("clicks").select("*", { count: "exact", head: true }).gte("created_at", yesterdayStart.toISOString()).lt("created_at", todayStart.toISOString()),
  ]);

  return {
    todayImpressions: ti.count ?? 0,
    todayClicks: tc.count ?? 0,
    yesterdayImpressions: yi.count ?? 0,
    yesterdayClicks: yc.count ?? 0,
  };
});
