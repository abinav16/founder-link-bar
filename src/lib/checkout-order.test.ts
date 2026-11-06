import { describe, it, expect } from "vitest";
import { buildOrderLines, planHasPaidAddOns } from "./checkout-order";

const sunday = "2099-01-04"; // a Sunday
describe("combined order pricing", () => {
  it("first startup with 500 clicks charges only the pack", () => {
    expect(buildOrderLines({ base: "clicks", clicks: 500 }, { needsListing: false, audience: 0 })?.totalCents).toBe(17900);
  });
  it("additional startup adds the $9.99 listing fee", () => {
    expect(buildOrderLines({ base: "clicks", clicks: 100 }, { needsListing: true, audience: 0 })?.totalCents).toBe(999 + 4900);
  });
  it("newsletter costs $0.25 per founder", () => {
    expect(buildOrderLines({ base: "free", newsletter: true, newsletterDate: sunday }, { needsListing: false, audience: 91 })?.newsletterCents).toBe(2275);
  });
  it("rejects past or non-Sunday newsletter dates", () => {
    expect(buildOrderLines({ base: "free", newsletter: true, newsletterDate: "2020-01-05" }, { needsListing: false, audience: 10 })).toBeNull();
    expect(buildOrderLines({ base: "free", newsletter: true, newsletterDate: "2099-01-05" }, { needsListing: false, audience: 10 })).toBeNull();
  });
  it("rejects unknown click packs and supporter", () => {
    expect(buildOrderLines({ base: "clicks", clicks: 123 }, { needsListing: false, audience: 0 })).toBeNull();
    expect(buildOrderLines({ base: "supporter" }, { needsListing: true, audience: 0 })).toBeNull();
  });
  it("free plan has no add-ons", () => {
    expect(planHasPaidAddOns({ base: "free" })).toBe(false);
    expect(planHasPaidAddOns({ base: "free", newsletter: true })).toBe(true);
  });
});
