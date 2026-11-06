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

import { listingKind as _lk, planTotalUsd as _pt } from "./checkout-plans";
import { describe as _d, it as _i, expect as _e } from "vitest";
_d("additional listing fee", () => {
  _i("first startup is free", () => _e(_pt({ base: "free" }, 0, _lk({ existingCount: 0, hasPrepaid: false, resubmit: false }))).toBe(0));
  _i("second startup costs $9.99", () => _e(_pt({ base: "free" }, 0, _lk({ existingCount: 1, hasPrepaid: false, resubmit: false }))).toBe(9.99));
  _i("prepaid credit makes it $0", () => _e(_pt({ base: "free" }, 0, _lk({ existingCount: 2, hasPrepaid: true, resubmit: false }))).toBe(0));
  _i("resubmission is free", () => _e(_pt({ base: "free" }, 0, _lk({ existingCount: 3, hasPrepaid: false, resubmit: true }))).toBe(0));
  _i("supporter pays nothing today", () => _e(_pt({ base: "supporter" }, 0, "additional")).toBe(0));
  _i("fee adds to clicks", () => _e(_pt({ base: "clicks", clicks: 100 }, 0, "additional")).toBe(58.99));
});
