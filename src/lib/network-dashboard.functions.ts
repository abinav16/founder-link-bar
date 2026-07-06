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
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: startups } = await supabase
      .from("startups")
      .select("id, name, website_url, description, logo_url, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200);

    const approvedIds = (startups ?? []).map((s) => s.id);

    // Totals include ALL startups that ever participated in the network
    // (approved + rejected/removed) so removing a startup doesn't erase the
    // impressions/clicks it contributed to the network's totals.
    const [totalsRes, per24hRes] = await Promise.all([
      supabase.rpc("public_network_totals_all" as any),
      supabase.rpc("public_startup_24h" as any, { _ids: approvedIds }),
    ]);

    const totalsRow = (totalsRes.data as any)?.[0] ?? {};
    const totalImpressions = Number(totalsRow.total_impressions ?? 0);
    const totalClicks = Number(totalsRow.total_clicks ?? 0);

    const per24h = (per24hRes.data ?? []) as Array<{
      startup_id: string;
      impressions_24h: number;
      clicks_24h: number;
    }>;
    const imp24hMap: Record<string, number> = {};
    const click24hMap: Record<string, number> = {};
    for (const r of per24h) {
      imp24hMap[r.startup_id] = Number(r.impressions_24h) || 0;
      click24hMap[r.startup_id] = Number(r.clicks_24h) || 0;
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

    return {
      stats: {
        totalStartups: cards.length,
        totalImpressions,
        totalClicks,
        ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 1000) / 10 : 0,
      },
      recentStartups: cards,
      newThisWeek: cards.filter((c) => c.created_at >= since7d),
      recentlyActive: [...cards]
        .filter((c) => c.impressions_24h > 0)
        .sort((a, b) => b.impressions_24h - a.impressions_24h)
        .slice(0, 12),
    };
  },
);
