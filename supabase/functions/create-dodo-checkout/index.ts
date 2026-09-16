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
    // LIVE MODE: real payments. Switch to "test" only for sandbox testing.
    const mode: "test" | "live" = "live";







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
    const kind: string = body?.kind === "featured"
      ? "featured"
      : body?.kind === "supporter"
      ? "supporter"
      : "listing";

    // Payment-return fallback: verify the subscription directly with Dodo and
    // fulfil the slot. This makes activation resilient when a webhook is late
    // or was not delivered, while still treating Dodo as the source of truth.
    if (body?.action === "confirm_featured") {
      const requestedId = typeof body?.subscription_id === "string"
        ? body.subscription_id.trim()
        : "";
      const baseUrl = mode === "test"
        ? "https://test.dodopayments.com"
        : "https://live.dodopayments.com";
      const paidStatuses = new Set(["active", "succeeded", "completed"]);

      const isMine = (sub: any) =>
        sub?.metadata?.kind === "featured" &&
        sub?.metadata?.user_id === userData.user.id;

      async function getSubscription(id: string) {
        const res = await fetch(`${baseUrl}/subscriptions/${encodeURIComponent(id)}`, {
          headers: { "Authorization": `Bearer ${apiKey}` },
        });
        const raw = await res.text();
        try {
          return res.ok && raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      }

      // Fallback discovery: this user's newest paid featured subscription.
      async function findMine() {
        const listRes = await fetch(`${baseUrl}/subscriptions`, {
          headers: { "Authorization": `Bearer ${apiKey}` },
        });
        const listRaw = await listRes.text();
        let listPayload: any = null;
        try {
          listPayload = listRaw ? JSON.parse(listRaw) : null;
        } catch {
          listPayload = null;
        }
        const candidates = Array.isArray(listPayload)
          ? listPayload
          : (Array.isArray(listPayload?.items) ? listPayload.items : []);
        return candidates.find((item: any) =>
          isMine(item) && paidStatuses.has(String(item?.status ?? "").toLowerCase())
        ) ?? null;
      }

      let subscription: any = requestedId ? await getSubscription(requestedId) : null;
      let subscriptionId = subscription ? requestedId : "";

      // If the direct lookup failed, is not ours, or isn't paid yet, try to
      // discover a paid featured subscription for this user instead of giving up.
      if (
        !subscription || !isMine(subscription) ||
        !paidStatuses.has(String(subscription.status ?? "").toLowerCase())
      ) {
        const discovered = await findMine();
        if (discovered) {
          subscription = discovered;
          subscriptionId = String(discovered.subscription_id ?? discovered.id ?? "");
        }
      }

      if (!subscription || !subscriptionId) {
        return new Response(JSON.stringify({ pending: true, error: "Payment not confirmed yet" }), {
          status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const metadata = subscription.metadata ?? {};
      const subscriptionStatus = String(subscription.status ?? "").toLowerCase();
      if (!isMine(subscription)) {
        return new Response(JSON.stringify({ error: "Subscription does not belong to this booking" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!paidStatuses.has(subscriptionStatus)) {
        return new Response(JSON.stringify({ pending: true, status: subscriptionStatus }), {
          status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }


      const slotIndex = Number(metadata.slot_index);
      const startupId = typeof metadata.startup_id === "string" ? metadata.startup_id : "";
      if (!Number.isInteger(slotIndex) || slotIndex < 1 || slotIndex > 8 || !startupId) {
        return new Response(JSON.stringify({ error: "Invalid subscription metadata" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceKey) {
        return new Response(JSON.stringify({ error: "Missing backend service configuration" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: existing } = await admin
        .from("featured_slots")
        .select("id, slot_index")
        .eq("dodo_payment_id", subscriptionId)
        .eq("status", "active")
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ active: true, slot_index: existing.slot_index }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // The startup in the subscription metadata can be gone (deleted and
      // re-applied). Fall back to this user's newest approved startup so a
      // paid booking is never lost to a stale id.
      let targetStartupId = startupId;
      const { data: metaStartup } = await admin
        .from("startups")
        .select("id")
        .eq("id", startupId)
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (!metaStartup) {
        const { data: fallbackStartup } = await admin
          .from("startups")
          .select("id")
          .eq("user_id", userData.user.id)
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!fallbackStartup) {
          return new Response(JSON.stringify({ error: "The startup for this booking no longer exists." }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        targetStartupId = fallbackStartup.id;
      }


      const nowIso = new Date().toISOString();
      const { data: activeSlots } = await admin
        .from("featured_slots")
        .select("slot_index")
        .eq("status", "active")
        .gt("expires_at", nowIso);
      const taken = new Set((activeSlots ?? []).map((row) => row.slot_index));
      const finalSlot = !taken.has(slotIndex)
        ? slotIndex
        : ([1, 2, 3, 4, 5, 6, 7, 8].find((candidate) => !taken.has(candidate)) ?? 0);
      if (!finalSlot) {
        return new Response(JSON.stringify({ error: "No featured slot is currently available" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: insertError } = await admin.from("featured_slots").insert({
        slot_index: finalSlot,
        startup_id: targetStartupId,
        user_id: userData.user.id,
        dodo_payment_id: subscriptionId,
        status: "active",
        starts_at: nowIso,
        expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      });
      if (insertError) {
        console.error("featured confirmation insert failed", insertError);
        return new Response(JSON.stringify({ error: "Could not activate featured slot" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ active: true, slot_index: finalSlot }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel a featured subscription. The slot stays live until the end of the
    // paid period; only auto-renewal is switched off.
    if (body?.action === "cancel_featured") {
      const slotId = typeof body?.slot_id === "string" ? body.slot_id.trim() : "";
      if (!slotId) {
        return new Response(JSON.stringify({ error: "Missing slot_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceKey) {
        return new Response(JSON.stringify({ error: "Missing backend service configuration" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: slotRow } = await admin
        .from("featured_slots")
        .select("id, user_id, dodo_payment_id, status, cancel_at_period_end, expires_at")
        .eq("id", slotId)
        .maybeSingle();
      // Ownership check: never let one user cancel another user's slot.
      if (!slotRow || slotRow.user_id !== userData.user.id) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (slotRow.cancel_at_period_end) {
        return new Response(JSON.stringify({ ok: true, already: true, expires_at: slotRow.expires_at }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const baseUrl = mode === "test"
        ? "https://test.dodopayments.com"
        : "https://live.dodopayments.com";
      if (slotRow.dodo_payment_id) {
        try {
          const res = await fetch(
            `${baseUrl}/subscriptions/${encodeURIComponent(slotRow.dodo_payment_id)}`,
            {
              method: "PATCH",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ cancel_at_next_billing_date: true }),
            },
          );
          if (!res.ok) {
            const detail = await res.text();
            console.error("dodo cancel failed", res.status, detail);
            return new Response(JSON.stringify({ error: "Could not cancel the subscription with the payment provider." }), {
              status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (e) {
          console.error("dodo cancel error", e);
          return new Response(JSON.stringify({ error: "Could not reach the payment provider." }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { error: updErr } = await admin
        .from("featured_slots")
        .update({ cancel_at_period_end: true, cancelled_at: new Date().toISOString() })
        .eq("id", slotId);
      if (updErr) {
        console.error("featured cancel update failed", updErr);
        return new Response(JSON.stringify({ error: "Could not record the cancellation" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, expires_at: slotRow.expires_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


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
      // A 401 here means the API key in use can read but not create — a
      // read-only / restricted Dodo key. Say so instead of an opaque error.
      const message = res.status === 401
        ? `Dodo rejected the ${mode} API key for ${endpoint} (401). The key appears to be read-only — generate a full-access ${mode} API key in Dodo and update the secret.`
        : data?.code === "CUSTOMER_HAS_EXISTING_SUBSCRIPTION"
        ? "You already have an active promotion subscription on this account. Cancel it (or wait for it to end) before booking another slot."
        : (data?.message ?? data ?? `Dodo returned ${res.status} with an empty response`);

      return new Response(
        JSON.stringify({ error: message, status: res.status, mode }),
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
