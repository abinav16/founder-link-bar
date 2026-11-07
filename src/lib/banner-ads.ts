// Shared prepaid weekly sponsorship rules. Views are analytics, never charges.
export const BANNER_WEEKLY_CENTS = 4900;
export const BANNER_MAX_WEEKS = 52;
export const BANNER_WEEK_PRESETS = [1, 4, 12, 26, 52] as const;
export const BANNER_EVERY_N_ROWS = 6;

export const BANNER_DESKTOP = { width: 1200, height: 200, label: "1200 × 200 px (6:1)" } as const;
export const BANNER_MOBILE = { width: 600, height: 300, label: "600 × 300 px (2:1)" } as const;

export function isValidWeeks(weeks: number): boolean {
  return Number.isInteger(weeks) && weeks >= 1 && weeks <= BANNER_MAX_WEEKS;
}

export function bannerTotalCents(weeks: number): number {
  if (!isValidWeeks(weeks)) return 0;
  return weeks * BANNER_WEEKLY_CENTS;
}

export function isVerifiedBannerPayment(payment: { status?: string; currency?: string; total_amount?: number; metadata?: { kind?: string; campaign_id?: string; user_id?: string; weeks?: string }; product_cart?: { product_id: string; quantity: number }[] }, campaign: { id: string; user_id: string; weeks: number }, productId: string): boolean {
  return payment.status === "succeeded" && payment.currency === "USD"
    && Number(payment.total_amount) >= bannerTotalCents(campaign.weeks) && isValidWeeks(campaign.weeks)
    && payment.metadata?.kind === "banner" && payment.metadata.campaign_id === campaign.id && payment.metadata.user_id === campaign.user_id
    && Boolean(payment.product_cart?.some((p) => p.product_id === productId && (p.quantity === campaign.weeks || (p.quantity === 1 && payment.metadata?.weeks === String(campaign.weeks)))));
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
