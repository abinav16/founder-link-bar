// Combined /apply checkout: optional extra-listing fee + click pack + newsletter
// spot. Prices are always recomputed on the server from shared constants.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildOrderLines, type OrderPlanInput } from "./checkout-order";

const ALLOWED_HOSTS = ["startupbar.co", "www.startupbar.co", "founder-link-bar.lovable.app"];
function okReturn(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOSTS.includes(u.hostname) || u.hostname.endsWith(".lovable.app") || u.hostname.endsWith(".lovableproject.com");
  } catch { return false; }
}

export type CreateOrderResult =
  | { ok: true; paymentLink: string }
  | { ok: false; reason: "date_taken" | "addons_unavailable" | "already_submitted" | "nothing_to_pay" | "invalid" | "error" };

export const createOrderCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { startupId: string; plan: OrderPlanInput; returnUrl: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(i?.startupId ?? "") || typeof i?.returnUrl !== "string") throw new Error("Invalid order");
    return i;
  })
  .handler(async ({ data, context }): Promise<CreateOrderResult> => {
    if (!okReturn(data.returnUrl)) return { ok: false, reason: "invalid" };
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) return { ok: false, reason: "error" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    const email = (context.claims as { email?: string }).email ?? "";

    const { data: exists } = await supabaseAdmin.from("startups").select("id").eq("id", data.startupId).maybeSingle();
    if (exists) return { ok: false, reason: "already_submitted" };
    const [{ count }, { data: credits }, { data: aud }] = await Promise.all([
      supabaseAdmin.from("startups").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabaseAdmin.from("payments").select("id").eq("user_id", uid).eq("status", "succeeded").is("consumed_at", null).limit(1),
      supabaseAdmin.rpc("public_newsletter_audience"),
    ]);
    const needsListing = (count ?? 0) >= 1 && (credits?.length ?? 0) === 0;
    const lines = buildOrderLines(data.plan, { needsListing, audience: Number(aud) || 0 });
    if (!lines) return { ok: false, reason: "invalid" };
    if (lines.totalCents <= 0) return { ok: false, reason: "nothing_to_pay" };

    const cart: Array<{ product_id: string; quantity: number; amount?: number }> = [];
    for (const l of lines.items) {
      const id = process.env[l.productEnv];
      if (!id) return { ok: false, reason: l.kind === "listing" ? "error" : "addons_unavailable" };
      cart.push({ product_id: id, quantity: 1, ...(l.kind === "newsletter" ? { amount: l.cents } : {}) });
    }

    const now = new Date().toISOString();
    await supabaseAdmin.from("checkout_orders").update({ status: "expired" }).eq("status", "pending").lt("expires_at", now);
    await supabaseAdmin.from("checkout_orders").update({ status: "expired" }).eq("status", "pending").eq("user_id", uid);
    const { data: order, error } = await supabaseAdmin.from("checkout_orders").insert({
      user_id: uid, startup_id: data.startupId,
      listing_cents: lines.listingCents, clicks: lines.clicks, clicks_cents: lines.clicksCents,
      newsletter_date: lines.newsletterDate, newsletter_recipients: lines.recipients, newsletter_cents: lines.newsletterCents,
      total_cents: lines.totalCents,
    }).select("id").single();
    if (error || !order) {
      if (error?.code === "23505") return { ok: false, reason: "date_taken" };
      console.error("[order] insert", error);
      return { ok: false, reason: "error" };
    }

    const sep = data.returnUrl.includes("?") ? "&" : "?";
    const res = await fetch("https://live.dodopayments.com/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        billing: { city: "", country: "US", state: "", street: "", zipcode: "" },
        customer: { email, name: email },
        payment_link: true,
        product_cart: cart,
        return_url: `${data.returnUrl}${sep}payment_id={payment_id}`,
        metadata: { kind: "order", order_id: order.id, user_id: uid, startup_id: data.startupId, listing: needsListing ? "1" : "0" },
      }),
    });
    const out = (await res.json().catch(() => null)) as { payment_link?: string; payment_id?: string } | null;
    if (!res.ok || !out?.payment_link) {
      console.error("[order] dodo", res.status, out);
      await supabaseAdmin.from("checkout_orders").update({ status: "failed" }).eq("id", order.id);
      return { ok: false, reason: "error" };
    }
    if (out.payment_id) await supabaseAdmin.from("checkout_orders").update({ dodo_payment_id: out.payment_id }).eq("id", order.id);
    return { ok: true, paymentLink: out.payment_link };
  });

/** Confirms an order payment on return from checkout. Idempotent with the webhook. */
export const confirmOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { paymentId: string }) => {
    if (typeof i?.paymentId !== "string" || !/^[\w-]{4,80}$/.test(i.paymentId)) throw new Error("Invalid payment");
    return i;
  })
  .handler(async ({ data, context }) => {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) return { status: "error" as const };
    const res = await fetch(`https://live.dodopayments.com/payments/${encodeURIComponent(data.paymentId)}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const p = (await res.json().catch(() => null)) as { status?: string; metadata?: Record<string, string> } | null;
    if (!res.ok || !p) return { status: "error" as const };
    if (p.metadata?.kind !== "order") return { status: "not_order" as const };
    if (p.metadata.user_id !== context.userId) return { status: "error" as const };
    if (String(p.status ?? "").toLowerCase() !== "succeeded") return { status: "pending" as const };
    const { markOrderPaid } = await import("./checkout-order.server");
    await markOrderPaid(p.metadata, data.paymentId);
    return { status: "paid" as const, listing: p.metadata.listing === "1" };
  });

/** Click pack for an existing approved startup the caller owns. Fulfils on payment. */
export const createBoostCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { startupId: string; clicks: number; returnUrl: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(i?.startupId ?? "") || typeof i?.returnUrl !== "string" || !Number.isFinite(Number(i?.clicks))) throw new Error("Invalid order");
    return { startupId: i.startupId, clicks: Number(i.clicks), returnUrl: i.returnUrl };
  })
  .handler(async ({ data, context }): Promise<CreateOrderResult> => {
    if (!okReturn(data.returnUrl)) return { ok: false, reason: "invalid" };
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) return { ok: false, reason: "error" };
    const uid = context.userId;
    const { data: own } = await context.supabase.from("startups").select("id, user_id, status, banned").eq("id", data.startupId).maybeSingle();
    if (!own || own.user_id !== uid || own.status !== "approved" || own.banned) return { ok: false, reason: "invalid" };
    const lines = buildOrderLines({ base: "clicks", clicks: data.clicks }, { needsListing: false, audience: 0 });
    if (!lines || !lines.clicks) return { ok: false, reason: "invalid" };
    const productId = process.env[lines.items[0].productEnv];
    if (!productId) return { ok: false, reason: "addons_unavailable" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims as { email?: string }).email ?? "";
    await supabaseAdmin.from("checkout_orders").update({ status: "expired" }).eq("status", "pending").eq("user_id", uid);
    const { data: order, error } = await supabaseAdmin.from("checkout_orders").insert({
      user_id: uid, startup_id: data.startupId, listing_cents: 0,
      clicks: lines.clicks, clicks_cents: lines.clicksCents, newsletter_cents: 0, total_cents: lines.totalCents,
    }).select("id").single();
    if (error || !order) { console.error("[boost] insert", error); return { ok: false, reason: "error" }; }
    const sep = data.returnUrl.includes("?") ? "&" : "?";
    const res = await fetch("https://live.dodopayments.com/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        billing: { city: "", country: "US", state: "", street: "", zipcode: "" },
        customer: { email, name: email },
        payment_link: true,
        product_cart: [{ product_id: productId, quantity: 1 }],
        return_url: `${data.returnUrl}${sep}payment_id={payment_id}`,
        metadata: { kind: "order", order_id: order.id, user_id: uid, startup_id: data.startupId, listing: "0" },
      }),
    });
    const out = (await res.json().catch(() => null)) as { payment_link?: string; payment_id?: string } | null;
    if (!res.ok || !out?.payment_link) {
      console.error("[boost] dodo", res.status, out);
      await supabaseAdmin.from("checkout_orders").update({ status: "failed" }).eq("id", order.id);
      return { ok: false, reason: "error" };
    }
    if (out.payment_id) await supabaseAdmin.from("checkout_orders").update({ dodo_payment_id: out.payment_id }).eq("id", order.id);
    return { ok: true, paymentLink: out.payment_link };
  });

/** Owner's click boosts with delivery progress. */
export const getMyClickBoosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("click_boosts")
      .select("startup_id, clicks_purchased, clicks_delivered, status, created_at")
      .eq("user_id", context.userId).in("status", ["paid", "active"]).order("created_at");
    return (data ?? []).filter((b) => b.clicks_delivered < b.clicks_purchased);
  });
