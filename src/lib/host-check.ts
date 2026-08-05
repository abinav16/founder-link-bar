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
    // Uses a security-definer RPC: the `banned` column is not readable with
    // the publishable key, so a direct select here fails with a permission
    // error and would silently block the whole network.
    const { data, error } = await supabase.rpc("is_approved_host", { _id: host });
    if (error) return cached?.ok ?? true;
    const ok = data === true;
    cache.set(host, { at: now, ok });
    return ok;
  } catch {
    // Fail open: a transient database issue must not kill the bar everywhere.
    return cached?.ok ?? true;
  }
}
