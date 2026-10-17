import { describe, expect, it } from "vitest";
import { SUPPORTER_PRICE_USD, SUPPORTER_TRIAL_DAYS } from "./supporter";
import { supporterTerm } from "../../supabase/functions/create-dodo-checkout/supporter-term";

describe("Supporter billing", () => {
  it("costs 999 USD per year", () => expect(SUPPORTER_PRICE_USD).toBe(999));
  it("has seven free trial days", () => expect(SUPPORTER_TRIAL_DAYS).toBe(7));
  it("grants only the seven-day trial rather than an unpaid year", () => {
    const now = Date.parse("2026-10-17T12:00:00Z");
    expect(supporterTerm({ status: "active", next_billing_date: "2026-10-24T12:00:00Z" }, now)?.until).toBe("2026-10-24T12:00:00.000Z");
  });
  it("does not extend the term on repeated confirmation", () => {
    const sub = { status: "active", next_billing_date: "2027-10-24T12:00:00Z" };
    expect(supporterTerm(sub, Date.parse("2026-10-24"))).toEqual(supporterTerm(sub, Date.parse("2026-10-25")));
  });
  it("preserves cancellation through the end of the trial", () => {
    expect(supporterTerm({ status: "active", next_billing_date: "2026-10-24T12:00:00Z", cancel_at_next_billing_date: true }, Date.parse("2026-10-17"))?.cancelling).toBe(true);
  });
  it("rejects failed or expired trial periods", () => {
    expect(supporterTerm({ status: "failed", next_billing_date: "2026-10-24" }, Date.parse("2026-10-17"))).toBeNull();
    expect(supporterTerm({ status: "active", next_billing_date: "2026-10-24" }, Date.parse("2026-10-25"))).toBeNull();
  });
});