import { isVerifiedBannerPayment } from "./banner-ads";

// Moves a paid banner campaign into admin review after verifying with Dodo.
export async function markBannerPaid(campaignId: string, userId?: string, knownPaymentId?: string): Promise<"in_review" | "pending" | "failed"> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: c } = await supabaseAdmin.from("ad_campaigns").select("id, user_id, status, dodo_payment_id, weeks, paid_at").eq("id", campaignId).maybeSingle();
  if (!c || (userId && c.user_id !== userId)) return "failed";
  if (c.paid_at) return "in_review";
  if (c.status !== "pending_payment") return "failed";
  const paymentId = knownPaymentId ?? c.dodo_payment_id;
  const apiKey = process.env["DODO_PAYMENTS_API_KEY"];
  const productId = process.env["DODO_BANNER_WEEKLY_PRODUCT_ID"];
  if (!paymentId || !apiKey || !productId) return "pending";
  if (c.dodo_payment_id && paymentId !== c.dodo_payment_id) return "failed";
  const res = await fetch(`https://live.dodopayments.com/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) return "pending";
  const p = (await res.json()) as Parameters<typeof isVerifiedBannerPayment>[0];
  if (p.status !== "succeeded") return p.status === "failed" || p.status === "cancelled" ? "failed" : "pending";
  if (!isVerifiedBannerPayment(p, c, productId)) return "failed";
  const { error } = await supabaseAdmin.rpc("confirm_weekly_banner_payment", { _id: campaignId, _payment_id: paymentId });
  if (error) throw new Error("Could not record banner payment");
  return "in_review";
}
