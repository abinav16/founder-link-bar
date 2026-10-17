/** Dodo is the source of truth for both the free trial and paid billing period. */
export function supporterTerm(subscription: {
  status?: string;
  next_billing_date?: string;
  cancel_at_next_billing_date?: boolean;
}, now = Date.now()): { until: string; cancelling: boolean } | null {
  if (subscription.status !== "active") return null;
  const end = Date.parse(subscription.next_billing_date ?? "");
  if (!Number.isFinite(end) || end <= now) return null;
  return { until: new Date(end).toISOString(), cancelling: subscription.cancel_at_next_billing_date === true };
}