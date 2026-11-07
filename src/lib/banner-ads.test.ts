import { describe, expect, it } from "vitest";
import { estimatedViews, fitsBannerSize, isValidBudget, normalizeDestination, BANNER_DESKTOP, BANNER_MOBILE } from "./banner-ads";

describe("banner ads", () => {
  it("$15 CPM: $100 buys about 6,666 views", () => {
    expect(estimatedViews(10000)).toBe(6666);
  });
  it("minimum budget is $50", () => {
    expect(isValidBudget(4999)).toBe(false);
    expect(isValidBudget(5000)).toBe(true);
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
