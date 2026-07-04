import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function getClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } }
  );
}

export interface LeaderboardRow {
  id: string;
  name: string;
  website_url: string;
  description: string;
  logo_url: string | null;
  impressions: number;
  clicks: number;
  impressions_given: number;
  dailyImpressions: number[];
  dailyGiven: number[];
}

export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();

  const { data: startups, error } = await supabase
    .from("startups")
    .select("id, name, website_url, description, logo_url")
    .eq("status", "approved");

  if (error) throw error;

  const ids = (startups ?? []).map((s) => s.id);

  const [totalsRes, dailyRes] = await Promise.all([
    supabase.rpc("public_startup_totals" as any, { _ids: ids }),
    supabase.rpc("public_startup_daily" as any, { _ids: ids }),
  ]);

  const totals = (totalsRes.data ?? []) as Array<{
    startup_id: string;
    impressions: number;
    clicks: number;
    impressions_given: number;
  }>;
  const daily = (dailyRes.data ?? []) as Array<{
    startup_id: string;
    day_offset: number;
    received: number;
    given: number;
  }>;

  const totalsMap = new Map(totals.map((t) => [t.startup_id, t]));
  const receivedBuckets = new Map<string, number[]>();
  const givenBuckets = new Map<string, number[]>();
  for (const id of ids) {
    receivedBuckets.set(id, [0, 0, 0, 0, 0, 0, 0]);
    givenBuckets.set(id, [0, 0, 0, 0, 0, 0, 0]);
  }
  for (const row of daily) {
    const idx = 6 - Number(row.day_offset);
    if (idx < 0 || idx > 6) continue;
    const r = receivedBuckets.get(row.startup_id);
    const g = givenBuckets.get(row.startup_id);
    if (r) r[idx] = Number(row.received) || 0;
    if (g) g[idx] = Number(row.given) || 0;
  }

  const rows: LeaderboardRow[] = (startups ?? []).map((s) => {
    const t = totalsMap.get(s.id);
    return {
      ...s,
      impressions: Number(t?.impressions ?? 0),
      clicks: Number(t?.clicks ?? 0),
      impressions_given: Number(t?.impressions_given ?? 0),
      dailyImpressions: receivedBuckets.get(s.id) ?? [0, 0, 0, 0, 0, 0, 0],
      dailyGiven: givenBuckets.get(s.id) ?? [0, 0, 0, 0, 0, 0, 0],
    };
  });

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
  const supabase = getClient();
  const { data } = await supabase.rpc("public_network_activity" as any);
  const row = (data as any)?.[0] ?? {};
  return {
    todayImpressions: Number(row.today_impressions ?? 0),
    todayClicks: Number(row.today_clicks ?? 0),
    yesterdayImpressions: Number(row.yesterday_impressions ?? 0),
    yesterdayClicks: Number(row.yesterday_clicks ?? 0),
  };
});
