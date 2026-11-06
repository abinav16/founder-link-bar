import { describe, expect, it } from "vitest";
import { CLICK_PACKS, newsletterPriceUsd, packSavingsPct, parsePlan, perClick, planTotalUsd } from "./checkout-plans";

describe("checkout plans", () => {
  it("click packs carry the agreed prices", () => {
    expect(CLICK_PACKS.map((p) => [p.clicks, p.priceUsd])).toEqual([[100, 49], [250, 99], [500, 179], [1000, 299]]);
  });
  it("bigger packs are cheaper per click", () => {
    expect(perClick(CLICK_PACKS[0])).toBe(0.49);
    expect(perClick(CLICK_PACKS[3])).toBe(0.3);
    expect(packSavingsPct(CLICK_PACKS[3])).toBe(38);
  });
  it("newsletter costs $0.25 per founder", () => {
    expect(newsletterPriceUsd(260)).toBe(65);
  });
  it("total combines pack and newsletter; supporter is $0 today", () => {
    expect(planTotalUsd({ base: "clicks", clicks: 500, newsletter: true }, 260)).toBe(244);
    expect(planTotalUsd({ base: "free" }, 260)).toBe(0);
    expect(planTotalUsd({ base: "supporter", newsletter: true }, 260)).toBe(0);
  });
  it("invalid stored plans fall back safely", () => {
    expect(parsePlan(null)).toEqual({ base: "free" });
    expect(parsePlan({ base: "clicks", clicks: 7 }).clicks).toBe(500);
  });
});
