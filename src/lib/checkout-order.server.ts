// Shared by the checkout return path and the Dodo webhook. Idempotent.
export async function markOrderPaid(meta: Record<string, string | undefined>, paymentId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const orderId = meta.order_id;
  const userId = meta.user_id;
  if (!orderId || !userId) return;
  const { data: order } = await supabaseAdmin.from("checkout_orders").select("id, status, startup_id, user_id").eq("id", orderId).maybeSingle();
  if (!order || order.user_id !== userId) return;
  if (order.status === "pending" || order.status === "expired" || order.status === "failed") {
    const { error } = await supabaseAdmin.from("checkout_orders")
      .update({ status: "paid", paid_at: new Date().toISOString(), dodo_payment_id: paymentId })
      .eq("id", orderId);
    if (error) console.error("[order] mark paid (manual review needed)", orderId, error);
  }
  if (meta.listing === "1") {
    await supabaseAdmin.from("payments").upsert(
      { user_id: userId, dodo_payment_id: paymentId, status: "succeeded" },
      { onConflict: "dodo_payment_id", ignoreDuplicates: true },
    );
  }
  // Fulfils only once the listing row exists; the app calls it again after submit.
  await supabaseAdmin.rpc("fulfil_checkout_orders", { _startup_id: order.startup_id });
}

export async function markOrderFailed(orderId: string | undefined) {
  if (!orderId) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("checkout_orders").update({ status: "failed" }).eq("id", orderId).eq("status", "pending");
}
