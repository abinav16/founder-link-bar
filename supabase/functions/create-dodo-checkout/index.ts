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
    return false;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("DODO_PAYMENTS_API_KEY");
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

    if (!isAllowedReturnUrl(return_url)) {
      return new Response(JSON.stringify({ error: "Invalid return_url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default to live; set DODO_MODE=test in secrets to use the test endpoint.
    const mode = Deno.env.get("DODO_MODE") ?? "live";
    const baseUrl = mode === "test"
      ? "https://test.dodopayments.com"
      : "https://live.dodopayments.com";
    // Append {payment_id} placeholder so Dodo substitutes the real ID on redirect.
    const sep = return_url.includes("?") ? "&" : "?";
    const finalReturnUrl = `${return_url}${sep}payment_id={payment_id}`;

    const res = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        billing: { city: "", country: "US", state: "", street: "", zipcode: "" },
        customer: { email, name: name || email },
        payment_link: true,
        product_cart: [{ product_id: "pdt_0NhWYhoEbLJW16TY9Eicc", quantity: 1 }],
        return_url: finalReturnUrl,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Dodo error:", data);
      return new Response(JSON.stringify({ error: data }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ payment_link: data.payment_link, payment_id: data.payment_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
