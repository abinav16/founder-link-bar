// Moves a paid banner campaign into admin review after verifying with Dodo.
export async function markBannerPaid(campaignId: string, userId?: string, knownPaymentId?: string): Promise<"in_review" | "pending" | "failed"> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: c } = await supabaseAdmin.from("ad_campaigns").select("id, user_id, status, dodo_payment_id, budget_cents").eq("id", campaignId).maybeSingle();
  if (!c || (userId && c.user_id !== userId)) return "failed";
  if (c.status !== "pending_payment") return "in_review";
  const paymentId = knownPaymentId ?? c.dodo_payment_id;
  const apiKey = process.env["DODO_PAYMENTS_API_KEY"];
  if (!paymentId || !apiKey) return "pending";
  const res = await fetch(`https://live.dodopayments.com/payments/${paymentId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) return "pending";
  const p = (await res.json()) as { status?: string; metadata?: { campaign_id?: string } };
  if (p.metadata?.campaign_id && p.metadata.campaign_id !== campaignId) return "failed";
  if (p.status !== "succeeded") return p.status === "failed" || p.status === "cancelled" ? "failed" : "pending";
  await supabaseAdmin.from("ad_campaigns").update({ status: "in_review", paid_at: new Date().toISOString(), dodo_payment_id: paymentId }).eq("id", campaignId).eq("status", "pending_payment");
  return "in_review";
}
