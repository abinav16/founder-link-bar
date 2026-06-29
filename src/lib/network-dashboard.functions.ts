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

export interface NetworkStats {
  totalStartups: number;
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
}

export interface StartupCard {
  id: string;
  name: string;
  website_url: string;
  description: string;
  logo_url: string | null;
  created_at: string;
  impressions_24h: number;
  clicks_24h: number;
}

export interface NetworkDashboardResult {
  stats: NetworkStats;
  recentStartups: StartupCard[];
  newThisWeek: StartupCard[];
  recentlyActive: StartupCard[];
}

export const getNetworkDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<NetworkDashboardResult> => {
    const supabase = getClient();

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const sinceToday = todayStart.toISOString();
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: startups } = await supabase
      .from("startups")
      .select("id, name, website_url, description, logo_url, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200);

    const approvedIds = (startups ?? []).map((s) => s.id);

    const [
      { count: totalImpressions },
      { count: totalClicks },
      { data: imps24h },
      { data: clicks24h },
    ] = await Promise.all([
      supabase
        .from("impressions")
        .select("*", { count: "exact", head: true })
        .in("shown_startup_id", approvedIds),
      supabase
        .from("clicks")
        .select("*", { count: "exact", head: true })
        .in("shown_startup_id", approvedIds),
      supabase
        .from("impressions")
        .select("shown_startup_id")
        .in("shown_startup_id", approvedIds)
        .gte("created_at", sinceToday),
      supabase
        .from("clicks")
        .select("shown_startup_id")
        .in("shown_startup_id", approvedIds)
        .gte("created_at", sinceToday),
    ]);

    const imp24hMap: Record<string, number> = {};
    for (const r of imps24h ?? []) {
      imp24hMap[r.shown_startup_id] = (imp24hMap[r.shown_startup_id] ?? 0) + 1;
    }
    const click24hMap: Record<string, number> = {};
    for (const r of clicks24h ?? []) {
      click24hMap[r.shown_startup_id] = (click24hMap[r.shown_startup_id] ?? 0) + 1;
    }

    const cards: StartupCard[] = (startups ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      website_url: s.website_url,
      description: s.description,
      logo_url: s.logo_url ?? null,
      created_at: s.created_at,
      impressions_24h: imp24hMap[s.id] ?? 0,
      clicks_24h: click24hMap[s.id] ?? 0,
    }));

    const ti = totalImpressions ?? 0;
    const tc = totalClicks ?? 0;

    return {
      stats: {
        totalStartups: cards.length,
        totalImpressions: ti,
        totalClicks: tc,
        ctr: ti > 0 ? Math.round((tc / ti) * 1000) / 10 : 0,
      },
      recentStartups: cards.slice(0, 12),
      newThisWeek: cards.filter((c) => c.created_at >= since7d),
      recentlyActive: [...cards]
        .filter((c) => c.impressions_24h > 0)
        .sort((a, b) => b.impressions_24h - a.impressions_24h)
        .slice(0, 12),
    };
  },
);
