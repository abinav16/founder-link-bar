import { createFileRoute } from "@tanstack/react-router";

const MIN_CENTS = 500;
const MAX_CENTS = 5_000_000; // $50,000 guard rail

const ALLOWED_ORIGINS = [
  "https://startupbar.co",
  "https://www.startupbar.co",
  "https://founder-link-bar.lovable.app",
];

function isAllowedOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:" && u.hostname !== "localhost") return false;
    if (ALLOWED_ORIGINS.includes(u.origin)) return true;
    if (u.hostname.endsWith(".lovable.app")) return true;
    if (u.hostname.endsWith(".lovableproject.com")) return true;
    if (u.hostname === "localhost") return true;
    return false;
  } catch {
    return false;
  }
}

function normalize(raw: string) {
  const value = (raw || "").trim();
  if (!value) return null;
  if (value.startsWith("@")) {
    const handle = value.slice(1).replace(/[^A-Za-z0-9_]/g, "");
    if (handle.length < 2) return null;
    return {
      urlKey: `@${handle.toLowerCase()}`,
      displayUrl: `@${handle}`,
      targetUrl: `https://x.com/${handle}`,
      name: `${handle} on X`,
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  if (!host.includes(".") || host.length < 4) return null;
  const path = parsed.pathname.replace(/\/+$/, "");
  return {
    urlKey: `${host}${path}`.toLowerCase(),
    displayUrl: `${host}${path}`,
    targetUrl: `https://${host}${path}`,
    name: host,
  };
}

export const Route = createFileRoute("/api/public/bid-checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
          });

        let body: any;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid request" }, 400);
        }

        const target = normalize(String(body?.url ?? ""));
        if (!target) return json({ error: "Enter a valid website or @handle." }, 400);

        const amountCents = Math.round(Number(body?.amount_cents));
        if (!Number.isFinite(amountCents) || amountCents < MIN_CENTS || amountCents > MAX_CENTS) {
          return json({ error: `Bids must be between $5 and $50,000.` }, 400);
        }

        const origin = request.headers.get("origin") ?? "";
        if (!isAllowedOrigin(origin)) return json({ error: "Invalid origin" }, 400);

        const apiKey = process.env.DODO_PAYMENTS_API_KEY;
        const productId = process.env.DODO_BID_PRODUCT_ID ?? process.env.DODO_PRODUCT_ID;
        if (!apiKey || !productId) {
          return json({ error: "Payments are not configured yet." }, 500);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Optional identity: a signed-in member's bid is stamped with their id,
        // derived from the bearer token rather than anything the client claims.
        let userId: string | null = null;
        let email: string | null = null;
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (token) {
          const { data } = await supabaseAdmin.auth.getUser(token);
          if (data?.user) {
            userId = data.user.id;
            email = data.user.email ?? null;
          }
        }

        const displayName =
          typeof body?.name === "string" && body.name.trim()
            ? body.name.trim().slice(0, 80)
            : target.name;

        const { data: bid, error: bidErr } = await supabaseAdmin
          .from("bids")
          .insert({
            url_key: target.urlKey,
            display_url: target.displayUrl,
            target_url: target.targetUrl,
            name: displayName,
            amount_cents: amountCents,
            status: "pending",
            user_id: userId,
            email,
          })
          .select("id")
          .single();

        if (bidErr || !bid) {
          console.error("[bid-checkout] insert failed", bidErr);
          return json({ error: "Could not start the checkout." }, 500);
        }

        const returnUrl = `${origin}/startupbid?bid=${bid.id}&payment_id={payment_id}`;

        const res = await fetch("https://live.dodopayments.com/payments", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            billing: { city: "", country: "US", state: "", street: "", zipcode: "" },
            customer: email
              ? { email, name: displayName }
              : { email: `bidder+${bid.id.slice(0, 8)}@startupbar.co`, name: displayName },
            payment_link: true,
            product_cart: [{ product_id: productId, quantity: 1, amount: amountCents }],
            return_url: returnUrl,
            metadata: { kind: "bid", bid_id: bid.id, url_key: target.urlKey },
          }),
        });

        const raw = await res.text();
        let data: any = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          data = null;
        }

        if (!res.ok || !data?.payment_link) {
          console.error("[bid-checkout] dodo error", res.status, raw.slice(0, 400));
          await supabaseAdmin.from("bids").update({ status: "failed" }).eq("id", bid.id);
          const message =
            res.status === 401
              ? "The payment provider rejected our credentials. Please try again shortly."
              : (data?.message ?? "Could not reach the payment provider.");
          return json({ error: message }, 400);
        }

        if (data.payment_id) {
          await supabaseAdmin.from("bids").update({ dodo_payment_id: data.payment_id }).eq("id", bid.id);
        }

        return json({ bid_id: bid.id, payment_link: data.payment_link });
      },
    },
  },
});
