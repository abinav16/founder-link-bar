import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Allowlist of return_url origins. Prevents attackers from creating checkouts
// that redirect the paying user to an attacker-controlled page after payment.
// NOTE: If a new custom domain is added for the app, add its https origin here
// too — otherwise checkouts on that domain will 400 with "Invalid return_url".
const ALLOWED_RETURN_ORIGINS = new Set([
  "https://startupbar.co",
  "https://www.startupbar.co",
  "https://founder-link-bar.lovable.app",
]);


function isAllowedReturnUrl(raw: unknown): raw is string {
  if (typeof raw !== "string" || !raw) return false;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    if (ALLOWED_RETURN_ORIGINS.has(u.origin)) return true;
    // Allow Lovable preview subdomains for this project.
    if (u.hostname.endsWith(".lovable.app")) return true;
    if (u.hostname.endsWith(".lovableproject.com")) return true;
    return false;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // In test mode, prefer the test-specific key; fall back to the live key so
    // the function still works if the test key hasn't been configured yet.
    // Keep the environment selector separate from Dodo credentials. The
    // dedicated variable takes precedence so an accidentally overwritten
    // legacy DODO_MODE value can never select the live checkout.
    const configuredMode = Deno.env.get("DODO_CHECKOUT_ENV") ?? Deno.env.get("DODO_MODE");
    const mode = configuredMode?.trim().toLowerCase() === "test" ? "test" : "live";

    // Non-sensitive diagnostic ping: reports which environment is active without
    // ever echoing credential values.
    if (new URL(req.url).searchParams.get("diag") === "1") {
      return new Response(
        JSON.stringify({
          mode,
          checkoutEnvSet: !!Deno.env.get("DODO_CHECKOUT_ENV"),
          checkoutEnvIsTest: Deno.env.get("DODO_CHECKOUT_ENV")?.trim().toLowerCase() === "test",
          legacyModeIsTest: Deno.env.get("DODO_MODE")?.trim().toLowerCase() === "test",
          hasTestApiKey: !!Deno.env.get("DODO_TEST_API_KEY"),
          hasTestFeaturedProduct: !!Deno.env.get("DODO_TEST_FEATURED_PRODUCT_ID"),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = mode === "test"
      ? (Deno.env.get("DODO_TEST_API_KEY") ?? Deno.env.get("DODO_PAYMENTS_API_KEY"))
      : Deno.env.get("DODO_PAYMENTS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing DODO_PAYMENTS_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Require an authenticated caller. Derive the email from the verified JWT
    // rather than trusting whatever the request body claims.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const email = userData.user.email;

    const body = await req.json().catch(() => ({}));
    const name: string = typeof body?.name === "string" ? body.name : "";
    const return_url: unknown = body?.return_url;
    const kind: string = body?.kind === "featured" ? "featured" : "listing";

    if (!isAllowedReturnUrl(return_url)) {
      return new Response(JSON.stringify({ error: "Invalid return_url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Product + metadata differ per purchase kind. In test mode, prefer
    // test-specific product IDs; fall back to the live ones if not set.
    const featuredId = mode === "test"
      ? (Deno.env.get("DODO_TEST_FEATURED_PRODUCT_ID") ?? Deno.env.get("DODO_FEATURED_PRODUCT_ID"))
      : Deno.env.get("DODO_FEATURED_PRODUCT_ID");
    const listingId = mode === "test"
      ? (Deno.env.get("DODO_TEST_PRODUCT_ID") ?? Deno.env.get("DODO_PRODUCT_ID"))
      : Deno.env.get("DODO_PRODUCT_ID");
    const productId = kind === "featured"
      ? (featuredId ?? listingId)
      : listingId;
    if (!productId) {
      return new Response(JSON.stringify({ error: "Missing Dodo product id" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata: Record<string, string> = { user_id: userData.user.id, kind };
    if (kind === "featured") {
      const slotIndex = Number(body?.slot_index);
      const startupId = body?.startup_id;
      if (!Number.isInteger(slotIndex) || slotIndex < 1 || slotIndex > 8 ||
          typeof startupId !== "string" || !startupId) {
        return new Response(JSON.stringify({ error: "Invalid featured slot request" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // The caller must own the startup they are promoting.
      const { data: owned } = await userClient
        .from("startups")
        .select("id")
        .eq("id", startupId)
        .eq("status", "approved")
        .maybeSingle();
      if (!owned) {
        return new Response(JSON.stringify({ error: "Startup not found or not approved" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      metadata.slot_index = String(slotIndex);
      metadata.startup_id = startupId;
    }


    // Default to live; set DODO_MODE=test in secrets to use the test endpoint.
    const baseUrl = mode === "test"
      ? "https://test.dodopayments.com"
      : "https://live.dodopayments.com";
    // Featured slots are a recurring subscription product in Dodo; listings are
    // a one-time payment. The two use different endpoints and return different
    // id fields on the redirect.
    const isSubscription = kind === "featured";
    const sep = return_url.includes("?") ? "&" : "?";
    const finalReturnUrl = isSubscription
      ? `${return_url}${sep}subscription_id={subscription_id}`
      : `${return_url}${sep}payment_id={payment_id}`;

    const endpoint = isSubscription ? "/subscriptions" : "/payments";
    const payload = isSubscription
      ? {
          billing: { city: "", country: "US", state: "", street: "", zipcode: "" },
          customer: { email, name: name || email },
          payment_link: true,
          product_id: productId,
          quantity: 1,
          return_url: finalReturnUrl,
          metadata,
        }
      : {
          billing: { city: "", country: "US", state: "", street: "", zipcode: "" },
          customer: { email, name: name || email },
          payment_link: true,
          product_cart: [{ product_id: productId, quantity: 1 }],
          return_url: finalReturnUrl,
          // Metadata is echoed back on webhook events, letting us reliably
          // map a payment to a StartupBar user even if the customer email
          // differs from their auth email.
          metadata,
        };

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Dodo can reply with an empty or non-JSON body (e.g. 401/5xx from the
    // gateway). Parsing that directly threw "Unexpected end of JSON input".
    const raw = await res.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { message: raw.slice(0, 500) };
    }

    if (!res.ok || !data?.payment_link) {
      console.error("Dodo error:", { status: res.status, mode, endpoint, body: raw.slice(0, 500) });
      return new Response(
        JSON.stringify({
          error: data ?? `Dodo returned ${res.status} with an empty response`,
          status: res.status,
          mode,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }


    console.log("dodo checkout created", { mode, endpoint, link: data.payment_link });
    return new Response(
      JSON.stringify({
        mode,
        payment_link: data.payment_link,
        payment_id: data.payment_id,
        subscription_id: data.subscription_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
