// Pricing rules for the /apply plan picker. Pure and browser-safe.
import { parseNewsletterDate } from "./newsletter-slots";

export type ClickPack = { clicks: number; priceUsd: number; popular?: boolean };

export const CLICK_PACKS: ClickPack[] = [
  { clicks: 100, priceUsd: 49 },
  { clicks: 250, priceUsd: 99 },
  { clicks: 500, priceUsd: 179, popular: true },
  { clicks: 1000, priceUsd: 299 },
];

/** Newsletter sponsor spot: price per founder on the list, USD. */
export const NEWSLETTER_PRICE_PER_FOUNDER_USD = 0.25;

export type CheckoutPlan = {
  base: "free" | "clicks" | "supporter";
  clicks?: number;
  newsletter?: boolean;
  newsletterDate?: string;
};

export const DEFAULT_PLAN: CheckoutPlan = { base: "free" };

export function perClick(pack: ClickPack): number {
  return Math.round((pack.priceUsd / pack.clicks) * 100) / 100;
}

/** Percent saved per click vs. the smallest pack, rounded down. */
export function packSavingsPct(pack: ClickPack): number {
  const base = CLICK_PACKS[0].priceUsd / CLICK_PACKS[0].clicks;
  const rate = pack.priceUsd / pack.clicks;
  return Math.max(0, Math.floor((1 - rate / base) * 100));
}

export function newsletterPriceUsd(recipients: number): number {
  return Math.round(Math.max(0, recipients) * NEWSLETTER_PRICE_PER_FOUNDER_USD * 100) / 100;
}

export function findPack(clicks: number | undefined): ClickPack | undefined {
  return CLICK_PACKS.find((p) => p.clicks === clicks);
}

/** Total due today (Supporter starts with a free trial, so $0 today). */
export function planTotalUsd(plan: CheckoutPlan, recipients: number): number {
  let t = 0;
  if (plan.base === "clicks") t += findPack(plan.clicks)?.priceUsd ?? 0;
  if (plan.newsletter && plan.base !== "supporter") t += newsletterPriceUsd(recipients);
  return Math.round(t * 100) / 100;
}

export function parsePlan(v: unknown): CheckoutPlan {
  if (!v || typeof v !== "object") return DEFAULT_PLAN;
  const o = v as Record<string, unknown>;
  const base = o.base === "clicks" || o.base === "supporter" ? o.base : "free";
  const clicks = base === "clicks" && findPack(Number(o.clicks)) ? Number(o.clicks) : base === "clicks" ? 500 : undefined;
  return { base, clicks, newsletter: base !== "supporter" && o.newsletter === true, newsletterDate: base !== "supporter" ? parseNewsletterDate(o.newsletterDate) : undefined };
}
