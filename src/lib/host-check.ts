/**
 * Host membership check for widget endpoints.
 *
 * The widget was being served (and impressions recorded) for any site that had
 * the script installed, including startups whose applications were rejected.
 * One rejected blogspot host produced ~71% of a day's impressions and zero
 * clicks, which crushed network CTR. Only approved, non-banned startups count
 * as hosts now.
 */

type Entry = { at: number; ok: boolean };

const TTL_MS = 60_000;
const cache = new Map<string, Entry>();

// Loosely typed on purpose: the caller passes a publishable-key client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function isApprovedHost(supabase: any, host: string | null): Promise<boolean> {
  // No host id at all = StartupBar's own pages (network, leaderboard, profiles).
  if (!host) return true;

  const cached = cache.get(host);
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.ok;

  try {
    const { data, error } = await supabase
      .from("startups")
      .select("status, banned")
      .eq("id", host)
      .maybeSingle();
    if (error) return cached?.ok ?? false;
    const ok = !!data && data.status === "approved" && data.banned !== true;
    cache.set(host, { at: now, ok });
    return ok;
  } catch {
    return cached?.ok ?? false;
  }
}
