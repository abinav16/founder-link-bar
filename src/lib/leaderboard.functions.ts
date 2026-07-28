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
  slug: string | null;
  name: string;
  website_url: string;
  description: string;
  logo_url: string | null;
  created_at: string;
  impressions: number;
  clicks: number;
  impressions_given: number;
  clicks_given: number;
  dailyImpressions: number[];
  dailyGiven: number[];
  dailyClicks: number[];
  dailyClicksGiven: number[];
  hourlyImpressions: number[];
  hourlyGiven: number[];
  hourlyClicks: number[];
}

const zeros = (n: number) => Array.from({ length: n }, () => 0);

export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();

  const { data: startups, error } = await supabase
    .from("startups")
    .select("id, slug, name, website_url, description, logo_url, created_at")
    .eq("status", "approved");


  if (error) throw error;

  const ids = (startups ?? []).map((s) => s.id);

  const [totalsRes, dailyRes, hourlyRes] = await Promise.all([
    supabase.rpc("public_startup_totals" as any, { _ids: ids }),
    supabase.rpc("public_startup_daily_v2" as any, { _ids: ids }),
    supabase.rpc("public_startup_hourly" as any, { _ids: ids }),
  ]);

  const totals = (totalsRes.data ?? []) as Array<{
    startup_id: string;
    impressions: number;
    clicks: number;
    impressions_given: number;
    clicks_given: number;
  }>;
  const daily = (dailyRes.data ?? []) as Array<{
    startup_id: string;
    day_offset: number;
    received: number;
    given: number;
    clicks: number;
    clicks_given: number;
  }>;
  const hourly = (hourlyRes.data ?? []) as Array<{
    startup_id: string;
    hour_offset: number;
    received: number;
    given: number;
    clicks: number;
  }>;

  const totalsMap = new Map(totals.map((t) => [t.startup_id, t]));
  const receivedBuckets = new Map<string, number[]>();
  const givenBuckets = new Map<string, number[]>();
  const clickBuckets = new Map<string, number[]>();
  const clickGivenBuckets = new Map<string, number[]>();
  const hReceived = new Map<string, number[]>();
  const hGiven = new Map<string, number[]>();
  const hClicks = new Map<string, number[]>();
  for (const id of ids) {
    receivedBuckets.set(id, zeros(7));
    givenBuckets.set(id, zeros(7));
    clickBuckets.set(id, zeros(7));
    clickGivenBuckets.set(id, zeros(7));
    hReceived.set(id, zeros(24));
    hGiven.set(id, zeros(24));
    hClicks.set(id, zeros(24));
  }
  for (const row of daily) {
    const idx = 6 - Number(row.day_offset);
    if (idx < 0 || idx > 6) continue;
    const r = receivedBuckets.get(row.startup_id);
    const g = givenBuckets.get(row.startup_id);
    const c = clickBuckets.get(row.startup_id);
    const cg = clickGivenBuckets.get(row.startup_id);
    if (r) r[idx] = Number(row.received) || 0;
    if (g) g[idx] = Number(row.given) || 0;
    if (c) c[idx] = Number(row.clicks) || 0;
    if (cg) cg[idx] = Number(row.clicks_given) || 0;
  }
  for (const row of hourly) {
    const idx = Number(row.hour_offset);
    if (idx < 0 || idx > 23) continue;
    const r = hReceived.get(row.startup_id);
    const g = hGiven.get(row.startup_id);
    const c = hClicks.get(row.startup_id);
    if (r) r[idx] = Number(row.received) || 0;
    if (g) g[idx] = Number(row.given) || 0;
    if (c) c[idx] = Number(row.clicks) || 0;
  }

  const rows: LeaderboardRow[] = (startups ?? []).map((s) => {
    const t = totalsMap.get(s.id);
    return {
      ...s,
      impressions: Number(t?.impressions ?? 0),
      clicks: Number(t?.clicks ?? 0),
      impressions_given: Number(t?.impressions_given ?? 0),
      clicks_given: Number(t?.clicks_given ?? 0),
      dailyImpressions: receivedBuckets.get(s.id) ?? zeros(7),
      dailyGiven: givenBuckets.get(s.id) ?? zeros(7),
      dailyClicks: clickBuckets.get(s.id) ?? zeros(7),
      dailyClicksGiven: clickGivenBuckets.get(s.id) ?? zeros(7),
      hourlyImpressions: hReceived.get(s.id) ?? zeros(24),
      hourlyGiven: hGiven.get(s.id) ?? zeros(24),
      hourlyClicks: hClicks.get(s.id) ?? zeros(24),
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
