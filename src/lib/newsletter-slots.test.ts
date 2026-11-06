import { describe, expect, it } from "vitest";
import { isNewsletterSunday, parseNewsletterDate } from "./newsletter-slots";
import { parsePlan } from "./checkout-plans";

describe("newsletter Sunday dates", () => {
  const now = new Date(2026, 10, 6);
  it("allows a future Sunday", () => {
    expect(isNewsletterSunday(new Date(2026, 10, 8), now)).toBe(true);
  });
  it("rejects other weekdays", () => {
    expect(isNewsletterSunday(new Date(2026, 10, 9), now)).toBe(false);
  });
  it("rejects past Sundays", () => {
    expect(isNewsletterSunday(new Date(2026, 10, 1), now)).toBe(false);
  });
  it("preserves only valid Sunday date strings", () => {
    expect(parseNewsletterDate("2026-11-08")).toBe("2026-11-08");
    expect(parseNewsletterDate("2026-11-09")).toBeUndefined();
    expect(parseNewsletterDate("2026-99-99")).toBeUndefined();
  });
  it("restores the selected Sunday from the saved checkout plan", () => {
    expect(parsePlan({ base: "clicks", clicks: 500, newsletter: true, newsletterDate: "2026-11-08" }).newsletterDate).toBe("2026-11-08");
  });
});