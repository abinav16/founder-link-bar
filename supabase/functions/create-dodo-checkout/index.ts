import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, name, return_url } = await req.json();
    const apiKey = Deno.env.get("DODO_PAYMENTS_API_KEY");

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing DODO_PAYMENTS_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use test mode by default; set DODO_MODE=live in secrets to switch to production.
    const mode = Deno.env.get("DODO_MODE") ?? "test";
    const baseUrl = mode === "live"
      ? "https://live.dodopayments.com"
      : "https://test.dodopayments.com";
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
        product_cart: [{ product_id: "pdt_0NhWTstgLoJiLAByVyHaR", quantity: 1 }],
        return_url,
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
