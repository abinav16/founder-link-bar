import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ToolError } from "@lovable.dev/mcp-js";

export async function leaderboardData(sb: SupabaseClient<Database>, period: "today" | "7d" | "all", direction: "received" | "delivered") {
  const startups: { id: string; name: string; slug: string | null }[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await sb.from("startups").select("id,name,slug").eq("status", "approved").eq("banned", false).order("created_at").order("id").range(offset, offset + 499);
    if (error) throw new ToolError("Could not read leaderboard listings.");
    startups.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) break;
    if (startups.length >= 10000) throw new ToolError("Leaderboard is too large for this report; use the website.");
  }
  const counts = new Map<string, { impressions: number; clicks: number }>();
  for (let i = 0; i < startups.length; i += 100) {
    const ids = startups.slice(i, i + 100).map(s => s.id);
    if (period === "all") {
      const { data, error } = await sb.rpc("public_startup_totals", { _ids: ids });
      if (error) throw new ToolError("Leaderboard totals are unavailable.");
      for (const r of data ?? []) counts.set(r.startup_id, { impressions: Number(direction === "received" ? r.impressions : r.impressions_given), clicks: Number(direction === "received" ? r.clicks : r.clicks_given) });
    } else {
      const { data, error } = await sb.rpc("public_startup_daily_v2", { _ids: ids });
      if (error) throw new ToolError("Leaderboard daily totals are unavailable.");
      for (const r of data ?? []) {
        if (period === "today" && r.day_offset !== 0) continue;
        const old = counts.get(r.startup_id) ?? { impressions: 0, clicks: 0 };
        counts.set(r.startup_id, { impressions: old.impressions + Number(direction === "received" ? r.received : r.given), clicks: old.clicks + Number(direction === "received" ? r.clicks : r.clicks_given) });
      }
    }
  }
  return startups.map(s => ({ ...s, ...(counts.get(s.id) ?? { impressions: 0, clicks: 0 }) })).sort((a, b) => b.impressions - a.impressions);
}