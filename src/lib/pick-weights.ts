/**
 * Reciprocity weighting for widget delivery.
 *
 * Uniform random picking is fair per-impression but not reciprocal: a site
 * that supplies a third of all network traffic still only receives 1/N of it
 * back. These helpers weight the pick by how much traffic each startup has
 * contributed over the last 7 days, capped so nobody can dominate and floored
 * at 1x so small and brand-new startups are never starved.
 */

type WeightMap = Record<string, number>;

let cache: { at: number; weights: WeightMap } | null = null;
const TTL_MS = 60_000;

// Loosely typed on purpose: the caller passes a publishable-key client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPickWeights(supabase: any): Promise<WeightMap> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.weights;

  try {
    const { data, error } = await supabase.rpc("widget_pick_weights");
    if (error || !Array.isArray(data)) return cache?.weights ?? {};
    const weights: WeightMap = {};
    for (const row of data as Array<{ startup_id: string; weight: number }>) {
      if (row?.startup_id && Number.isFinite(row.weight)) {
        weights[row.startup_id] = Math.max(1, Math.min(4, row.weight));
      }
    }
    cache = { at: now, weights };
    return weights;
  } catch {
    return cache?.weights ?? {};
  }
}

export function weightedPick<T extends { id: string }>(
  items: T[],
  weights: WeightMap
): T {
  let total = 0;
  const cumulative: number[] = [];
  for (const item of items) {
    total += weights[item.id] ?? 1;
    cumulative.push(total);
  }
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];

  const r = Math.random() * total;
  for (let i = 0; i < cumulative.length; i++) {
    if (r < cumulative[i]) return items[i];
  }
  return items[items.length - 1];
}
