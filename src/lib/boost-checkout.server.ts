import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildOrderLines } from "./checkout-order";

export type CreateOrderResult =
  | { ok: true; paymentLink: string }
  | { ok: false; reason: "date_taken" | "addons_unavailable" | "already_submitted" | "nothing_to_pay" | "invalid" | "error" };

/** Shared owner-authorized checkout for website and OAuth MCP callers. */
export async function boostCheckout(
  data: { startupId: string; clicks: number; returnUrl: string },
  caller: { supabase: SupabaseClient<Database>; userId: string; email: string },
): Promise<CreateOrderResult> {
  const { data: own, error: ownershipError } = await caller.supabase.from("startups")
    .select("id,user_id,status,banned").eq("id", data.startupId).eq("user_id", caller.userId).maybeSingle();
  if (ownershipError || !own || own.user_id !== caller.userId || own.status !== "approved" || own.banned) return { ok: false, reason: "invalid" };
  const lines = buildOrderLines({ base: "clicks", clicks: data.clicks }, { needsListing: false, audience: 0 });
  const line = lines?.items[0];
  if (!lines?.clicks || !line) return { ok: false, reason: "invalid" };
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) return { ok: false, reason: "error" };
  const productId = process.env[line.productEnv];
  if (!productId) return { ok: false, reason: "addons_unavailable" };
  // Only after caller ownership/eligibility is established: service-written orders.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("checkout_orders").update({ status: "expired" })
    .eq("status", "pending").eq("user_id", caller.userId).lt("expires_at", new Date().toISOString());
  const { data: order, error } = await supabaseAdmin.from("checkout_orders").insert({
    user_id: caller.userId, startup_id: data.startupId, listing_cents: 0,
    clicks: lines.clicks, clicks_cents: lines.clicksCents, newsletter_cents: 0, total_cents: lines.totalCents,
  }).select("id").single();
  if (error || !order) return { ok: false, reason: "error" };
  try {
    const sep = data.returnUrl.includes("?") ? "&" : "?";
    const res = await fetch("https://live.dodopayments.com/payments", {
      method: "POST", signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        billing: { city: "", country: "US", state: "", street: "", zipcode: "" },
        customer: { email: caller.email, name: caller.email }, payment_link: true,
        product_cart: [{ product_id: productId, quantity: 1 }],
        return_url: `${data.returnUrl}${sep}payment_id={payment_id}`,
        metadata: { kind: "order", order_id: order.id, user_id: caller.userId, startup_id: data.startupId, listing: "0" },
      }),
    });
    const out = await res.json().catch(() => null) as { payment_link?: string; payment_id?: string } | null;
    if (!res.ok || !out?.payment_link || !out.payment_link.startsWith("https://")) throw new Error("Checkout unavailable");
    if (out.payment_id) await supabaseAdmin.from("checkout_orders").update({ dodo_payment_id: out.payment_id }).eq("id", order.id);
    return { ok: true, paymentLink: out.payment_link };
  } catch {
    await supabaseAdmin.from("checkout_orders").update({ status: "failed" }).eq("id", order.id);
    return { ok: false, reason: "error" };
  }
}