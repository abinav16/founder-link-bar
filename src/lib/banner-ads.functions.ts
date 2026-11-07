import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { bannerTotalCents, isValidWeeks, normalizeDestination } from "./banner-ads";

export type PublicBanner = {
  id: string;
  advertiser_name: string;
  headline: string;
  destination_url: string;
  desktop_image_url: string;
  mobile_image_url: string;
  expires_at: string;
};

export const pickBanners = createServerFn({ method: "GET" }).handler(async (): Promise<PublicBanner[]> => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await sb.rpc("public_pick_weekly_banners", { _count: 4 });
  if (error) { console.error("[banners] pick", error.message); return []; }
  return (data ?? []) as PublicBanner[];
});

const ALLOWED_HOSTS = ["startupbar.co", "www.startupbar.co", "founder-link-bar.lovable.app"];
function okReturn(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOSTS.includes(u.hostname) || u.hostname.endsWith(".lovable.app") || u.hostname.endsWith(".lovableproject.com");
  } catch { return false; }
}

export type BannerCheckoutResult = { ok: true; paymentLink: string } | { ok: false; reason: string };

export const createBannerCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { advertiserName: string; headline: string; destinationUrl: string; desktopImageUrl: string; mobileImageUrl: string; weeks: number; returnUrl: string }) => i)
  .handler(async ({ data, context }): Promise<BannerCheckoutResult> => {
    const name = String(data.advertiserName ?? "").trim().slice(0, 60);
    const headline = String(data.headline ?? "").trim().slice(0, 120);
    const dest = normalizeDestination(String(data.destinationUrl ?? ""));
    if (!name) return { ok: false, reason: "Add your company name." };
    if (!dest) return { ok: false, reason: "Use a full https:// destination link." };
    if (!isValidWeeks(data.weeks)) return { ok: false, reason: "Choose between 1 and 52 whole weeks." };
    if (!okReturn(data.returnUrl)) return { ok: false, reason: "Invalid return page." };
    const base = `${process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"]}/storage/v1/object/public/ad-banners/${context.userId}/`;
    const imgOk = (u: string) => typeof u === "string" && u.startsWith(base) && !u.slice(base.length).includes("/") && /\.(png|jpe?g|webp)$/i.test(u);
    if (!imgOk(data.desktopImageUrl) || !imgOk(data.mobileImageUrl)) return { ok: false, reason: "Upload both banner images." };

    const apiKey = process.env["DODO_PAYMENTS_API_KEY"];
    const productId = process.env["DODO_BANNER_WEEKLY_PRODUCT_ID"];
    if (!apiKey || !productId) return { ok: false, reason: "Banner payments aren't set up yet. Please try again soon." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("ad_campaigns").insert({
      user_id: context.userId,
      advertiser_name: name,
      headline,
      destination_url: dest,
      desktop_image_url: data.desktopImageUrl,
      mobile_image_url: data.mobileImageUrl,
      budget_cents: bannerTotalCents(data.weeks),
      weeks: data.weeks,
    }).select("id").single();
    if (error || !row) { console.error("[banner] insert", error); return { ok: false, reason: "Couldn't save your campaign." }; }

    const email = (context.claims as { email?: string }).email ?? "";
    const ret = new URL(data.returnUrl);
    ret.searchParams.set("banner", row.id);
    const res = await fetch("https://live.dodopayments.com/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        billing: { city: "", country: "US", state: "", street: "", zipcode: "" },
        customer: { email, name },
        payment_link: true,
        product_cart: [{ product_id: productId, quantity: data.weeks }],
        return_url: ret.toString(),
        metadata: { kind: "banner", campaign_id: row.id, user_id: context.userId },
      }),
    });
    const raw = await res.text();
    let j: { payment_link?: string; payment_id?: string } | null = null;
    try { j = JSON.parse(raw); } catch { j = null; }
    if (!res.ok || !j?.payment_link) {
      console.error("[banner] dodo request failed", res.status);
      return { ok: false, reason: "Couldn't reach the payment provider." };
    }
    if (j.payment_id) await supabaseAdmin.from("ad_campaigns").update({ dodo_payment_id: j.payment_id }).eq("id", row.id);
    return { ok: true, paymentLink: j.payment_link };
  });

export const getMyBannerCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("ad_campaigns")
      .select("id, advertiser_name, status, budget_cents, weeks, starts_at, expires_at, impressions, clicks, rejection_reason, created_at, desktop_image_url")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({ ...r, status: r.status === "running" && r.expires_at && Date.parse(r.expires_at) <= Date.now() ? "finished" : r.status, impressions: Number(r.impressions), clicks: Number(r.clicks) }));
  });

/** Called on return from checkout; verifies with Dodo and moves the campaign to review. */
export const confirmBannerPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { campaignId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(i?.campaignId ?? "")) throw new Error("Invalid");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { markBannerPaid } = await import("./banner-ads.server");
    return { status: await markBannerPaid(data.campaignId, context.userId) };
  });
