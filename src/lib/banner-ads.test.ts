import { describe, expect, it } from "vitest";
import { bannerTotalCents, fitsBannerSize, isValidWeeks, isVerifiedBannerPayment, normalizeDestination, BANNER_DESKTOP, BANNER_MOBILE } from "./banner-ads";

describe("banner ads", () => {
  it("costs $49 per week with one prepaid total", () => {
    expect(bannerTotalCents(1)).toBe(4900);
    expect(bannerTotalCents(4)).toBe(19600);
    expect(bannerTotalCents(52)).toBe(254800);
  });
  it("allows only whole durations from 1 to 52 weeks", () => {
    expect(isValidWeeks(1)).toBe(true);
    expect(isValidWeeks(52)).toBe(true);
    for (const n of [0, -1, 1.5, 53, NaN]) expect(isValidWeeks(n)).toBe(false);
  });
  it("requires a successful payment for the correct owner, campaign, product and duration", () => {
    const c = { id: "campaign", user_id: "owner", weeks: 4 };
    const p = { status: "succeeded", currency: "USD", total_amount: 19600, metadata: { kind: "banner", campaign_id: c.id, user_id: c.user_id }, product_cart: [{ product_id: "weekly", quantity: 4 }] };
    expect(isVerifiedBannerPayment(p, c, "weekly")).toBe(true);
    expect(isVerifiedBannerPayment({ ...p, total_amount: 19599 }, c, "weekly")).toBe(false);
    expect(isVerifiedBannerPayment({ ...p, status: "pending" }, c, "weekly")).toBe(false);
    expect(isVerifiedBannerPayment({ ...p, metadata: { ...p.metadata, user_id: "other" } }, c, "weekly")).toBe(false);
    expect(isVerifiedBannerPayment(p, c, "other-product")).toBe(false);
    expect(isVerifiedBannerPayment({ ...p, product_cart: [{ product_id: "weekly", quantity: 1 }] }, c, "weekly")).toBe(false);
  });
  it("checks banner sizes", () => {
    expect(fitsBannerSize(1200, 200, BANNER_DESKTOP)).toBe(true);
    expect(fitsBannerSize(1200, 400, BANNER_DESKTOP)).toBe(false);
    expect(fitsBannerSize(600, 300, BANNER_MOBILE)).toBe(true);
    expect(fitsBannerSize(300, 150, BANNER_MOBILE)).toBe(false);
  });
  it("only https destinations", () => {
    expect(normalizeDestination("http://a.com")).toBeNull();
    expect(normalizeDestination("https://a.com/x")).toBe("https://a.com/x");
  });
});
