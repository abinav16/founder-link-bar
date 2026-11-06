// Pure order pricing for the combined /apply checkout (browser and server safe).
import { ADDITIONAL_LISTING_PRICE_USD, findPack, NEWSLETTER_PRICE_PER_FOUNDER_USD } from "./checkout-plans";
import { parseNewsletterDate } from "./newsletter-slots";

export type OrderPlanInput = { base?: string; clicks?: number; newsletter?: boolean; newsletterDate?: string };

export type OrderLine = { kind: "listing" | "clicks" | "newsletter"; cents: number; productEnv: string };

const CLICK_ENV: Record<number, string> = {
  100: "DODO_CLICKS_100_PRODUCT_ID",
  250: "DODO_CLICKS_250_PRODUCT_ID",
  500: "DODO_CLICKS_500_PRODUCT_ID",
  1000: "DODO_CLICKS_1000_PRODUCT_ID",
};

export function buildOrderLines(plan: OrderPlanInput, o: { needsListing: boolean; audience: number }) {
  if (plan.base === "supporter") return null;
  const items: OrderLine[] = [];
  let clicks: number | null = null, newsletterDate: string | null = null, recipients: number | null = null;
  if (o.needsListing) items.push({ kind: "listing", cents: Math.round(ADDITIONAL_LISTING_PRICE_USD * 100), productEnv: "DODO_PRODUCT_ID" });
  if (plan.base === "clicks") {
    const pack = findPack(Number(plan.clicks));
    if (!pack) return null;
    clicks = pack.clicks;
    items.push({ kind: "clicks", cents: pack.priceUsd * 100, productEnv: CLICK_ENV[pack.clicks] });
  }
  if (plan.newsletter === true) {
    newsletterDate = parseNewsletterDate(plan.newsletterDate) ?? null;
    if (!newsletterDate) return null;
    recipients = Math.max(0, Math.floor(o.audience));
    items.push({ kind: "newsletter", cents: Math.max(100, Math.round(recipients * NEWSLETTER_PRICE_PER_FOUNDER_USD * 100)), productEnv: "DODO_NEWSLETTER_PRODUCT_ID" });
  }
  const c = (k: OrderLine["kind"]) => items.find((i) => i.kind === k)?.cents ?? 0;
  return {
    items, clicks, newsletterDate, recipients,
    listingCents: c("listing"), clicksCents: c("clicks"), newsletterCents: c("newsletter"),
    totalCents: items.reduce((s, i) => s + i.cents, 0),
  };
}

/** True when the plan has a paid add-on that needs the combined checkout. */
export function planHasPaidAddOns(plan: OrderPlanInput) {
  return plan.base !== "supporter" && (plan.base === "clicks" || plan.newsletter === true);
}
