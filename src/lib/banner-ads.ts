// Banner ad pricing shared by the advertise page, setup page and server.
// Banners have no fixed slots: running campaigns rotate at random, weighted by
// remaining budget, and each counted view debits CPM / 1000.

export const BANNER_CPM_CENTS = 1500; // $15 per 1,000 views
export const BANNER_MIN_BUDGET_CENTS = 5000; // $50
export const BANNER_MAX_BUDGET_CENTS = 5_000_000; // $50,000
export const BANNER_BUDGET_PRESETS_USD = [100, 250, 500, 1000] as const;
export const BANNER_EVERY_N_ROWS = 6;

export const BANNER_DESKTOP = { width: 1200, height: 200, label: "1200 × 200 px (6:1)" } as const;
export const BANNER_MOBILE = { width: 600, height: 300, label: "600 × 300 px (2:1)" } as const;

export function estimatedViews(budgetCents: number, cpmCents = BANNER_CPM_CENTS): number {
  if (!Number.isFinite(budgetCents) || budgetCents <= 0) return 0;
  return Math.floor((budgetCents / cpmCents) * 1000);
}

export function isValidBudget(budgetCents: number): boolean {
  return Number.isInteger(budgetCents) && budgetCents >= BANNER_MIN_BUDGET_CENTS && budgetCents <= BANNER_MAX_BUDGET_CENTS;
}

/** Aspect check with 5% tolerance and minimum size. */
export function fitsBannerSize(w: number, h: number, spec: { width: number; height: number }): boolean {
  if (w < spec.width || h < spec.height) return false;
  const want = spec.width / spec.height;
  return Math.abs(w / h - want) / want <= 0.05;
}

export function normalizeDestination(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
