export const LIVE_VISITOR_LIMIT = 200;

export function prependVisitor<T extends { id: string }>(history: T[], visitor: T): T[] {
  return [visitor, ...history.filter((item) => item.id !== visitor.id)].slice(0, LIVE_VISITOR_LIMIT);
}

/**
 * One browser session = one visitor. The bar logs a fresh row on every
 * rotation and page load, so rows are grouped by session (falling back to
 * the row id for legacy rows without one).
 */
export function visitorKey(row: { id: string; session_id?: string | null }): string {
  return row.session_id ? `s:${row.session_id}` : row.id;
}

/** Keeps the first row per visitor — pass rows newest-first to keep each visitor's latest activity. */
export function uniqueVisitors<T extends { id: string; session_id?: string | null }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = visitorKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
