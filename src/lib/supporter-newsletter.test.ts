import { describe, expect, it } from "vitest";
import { isPaidSupporterCharge } from "./supporter-newsletter";

const paid = { status: "succeeded", currency: "USD", total_amount: 99900, subscription_id: "sub_1" };
describe("Supporter newsletter unlock", () => {
  it("unlocks after the successful $999 annual charge", () => expect(isPaidSupporterCharge(paid, "sub_1")).toBe(true));
  it("never unlocks on the zero-dollar trial", () => expect(isPaidSupporterCharge({ ...paid, total_amount: 0 }, "sub_1")).toBe(false));
  it("never unlocks on subscription activation alone", () => expect(isPaidSupporterCharge({ ...paid, status: "active" }, "sub_1")).toBe(false));
  it("rejects a failed charge", () => expect(isPaidSupporterCharge({ ...paid, status: "failed" }, "sub_1")).toBe(false));
  it("rejects another subscription", () => expect(isPaidSupporterCharge(paid, "sub_2")).toBe(false));
  it("requires USD", () => expect(isPaidSupporterCharge({ ...paid, currency: "EUR" }, "sub_1")).toBe(false));
});