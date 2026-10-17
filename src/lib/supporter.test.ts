import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SUPPORTER_PRICE_USD, SUPPORTER_TRIAL_DAYS } from "./supporter";
import { supporterTerm } from "../../supabase/functions/create-dodo-checkout/supporter-term";

describe("Supporter billing", () => {
  it("costs 999 USD per year", () => assert.equal(SUPPORTER_PRICE_USD, 999));
  it("has seven free trial days", () => assert.equal(SUPPORTER_TRIAL_DAYS, 7));
  it("grants only the seven-day trial rather than an unpaid year", () => {
    const now = Date.parse("2026-10-17T12:00:00Z");
    assert.equal(supporterTerm({ status: "active", next_billing_date: "2026-10-24T12:00:00Z" }, now)?.until, "2026-10-24T12:00:00.000Z");
  });
  it("does not extend the term on repeated confirmation", () => {
    const sub = { status: "active", next_billing_date: "2027-10-24T12:00:00Z" };
    assert.deepEqual(supporterTerm(sub, Date.parse("2026-10-24")), supporterTerm(sub, Date.parse("2026-10-25")));
  });
  it("preserves cancellation through the end of the trial", () => {
    assert.equal(supporterTerm({ status: "active", next_billing_date: "2026-10-24T12:00:00Z", cancel_at_next_billing_date: true }, Date.parse("2026-10-17"))?.cancelling, true);
  });
  it("rejects failed or expired trial periods", () => {
    assert.equal(supporterTerm({ status: "failed", next_billing_date: "2026-10-24" }, Date.parse("2026-10-17")), null);
    assert.equal(supporterTerm({ status: "active", next_billing_date: "2026-10-24" }, Date.parse("2026-10-25")), null);
  });
});