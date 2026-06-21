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

    // Default to live; set DODO_MODE=test in secrets to use the test endpoint.
    const mode = Deno.env.get("DODO_MODE") ?? "live";
    const baseUrl = mode === "test"
      ? "https://test.dodopayments.com"
      : "https://live.dodopayments.com";
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
