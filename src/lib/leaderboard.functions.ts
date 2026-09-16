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
  sponsored: boolean;
  supporter: boolean;
  dailyImpressions: number[];
  dailyGiven: number[];
  dailyClicks: number[];
  dailyClicksGiven: number[];
  hourlyImpressions: number[];
  hourlyGiven: number[];
  hourlyClicks: number[];
  monthlyImpressions: number[];
  monthlyGiven: number[];
  monthlyClicks: number[];
}

const zeros = (n: number) => Array.from({ length: n }, () => 0);

export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();

  const { data: startups, error } = await supabase
    .from("startups")
    .select("id, slug, name, website_url, description, logo_url, created_at, sponsored, membership_mode, supporter_until")
    .eq("status", "approved");


  if (error) throw error;

  const ids = (startups ?? []).map((s) => s.id);

  // PostgREST caps every response at 1000 rows. These RPCs return N rows per
  // startup (24 hourly, 12 monthly, 7 daily), so the id list is chunked to stay
  // under the cap — otherwise later startups silently come back as flat zeros.
  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out.length ? out : [[]];
  };
  const rpcChunked = async (fn: string, rowsPerStartup: number) => {
    const size = Math.max(1, Math.floor(900 / rowsPerStartup));
    const parts = await Promise.all(
      chunk(ids, size).map((slice) => supabase.rpc(fn as any, { _ids: slice }))
    );
    return parts.flatMap((p) => (p.data ?? []) as any[]);
  };

  const [totalsRes, daily, hourly, monthly] = await Promise.all([
    supabase.rpc("public_startup_totals" as any, { _ids: ids }),
    rpcChunked("public_startup_daily_v2", 7),
    rpcChunked("public_startup_hourly", 24),
    rpcChunked("public_startup_monthly", 12),
  ]);


  const totals = (totalsRes.data ?? []) as Array<{
    startup_id: string;
    impressions: number;
    clicks: number;
    impressions_given: number;
    clicks_given: number;
  }>;



  const totalsMap = new Map(totals.map((t) => [t.startup_id, t]));
  const receivedBuckets = new Map<string, number[]>();
  const givenBuckets = new Map<string, number[]>();
  const clickBuckets = new Map<string, number[]>();
  const clickGivenBuckets = new Map<string, number[]>();
  const hReceived = new Map<string, number[]>();
  const hGiven = new Map<string, number[]>();
  const hClicks = new Map<string, number[]>();
  const mReceived = new Map<string, number[]>();
  const mGiven = new Map<string, number[]>();
  const mClicks = new Map<string, number[]>();
  for (const id of ids) {
    receivedBuckets.set(id, zeros(7));
    givenBuckets.set(id, zeros(7));
    clickBuckets.set(id, zeros(7));
    clickGivenBuckets.set(id, zeros(7));
    hReceived.set(id, zeros(24));
    hGiven.set(id, zeros(24));
    hClicks.set(id, zeros(24));
    mReceived.set(id, zeros(12));
    mGiven.set(id, zeros(12));
    mClicks.set(id, zeros(12));
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
  for (const row of monthly) {
    // month_offset 0 = current month → last index (rightmost bar)
    const idx = 11 - Number(row.month_offset);
    if (idx < 0 || idx > 11) continue;
    const r = mReceived.get(row.startup_id);
    const g = mGiven.get(row.startup_id);
    const c = mClicks.get(row.startup_id);
    if (r) r[idx] = Number(row.received) || 0;
    if (g) g[idx] = Number(row.given) || 0;
    if (c) c[idx] = Number(row.clicks) || 0;
  }

  const rows: LeaderboardRow[] = (startups ?? []).map((s) => {
    const t = totalsMap.get(s.id);
    return {
      ...s,
      sponsored: Boolean((s as any).sponsored),
      supporter:
        (s as any).membership_mode === "supporter" &&
        (!(s as any).supporter_until || new Date((s as any).supporter_until).getTime() > Date.now()),
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
      monthlyImpressions: mReceived.get(s.id) ?? zeros(12),
      monthlyGiven: mGiven.get(s.id) ?? zeros(12),
      monthlyClicks: mClicks.get(s.id) ?? zeros(12),
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
