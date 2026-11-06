import { SUPPORTER_PRICE_USD } from "./supporter";

export function isPaidSupporterCharge(payment: { status?: string; currency?: string; total_amount?: number; subscription_id?: string }, subscriptionId: string) {
  return payment.status === "succeeded" && payment.currency === "USD" &&
    Number.isSafeInteger(payment.total_amount) && (payment.total_amount ?? 0) >= SUPPORTER_PRICE_USD * 100 &&
    payment.subscription_id === subscriptionId;
}