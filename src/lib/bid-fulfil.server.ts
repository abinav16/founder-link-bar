/**
 * Server-only fulfilment helpers for StartupBid.
 * Used by both the Dodo webhook and the payment-return status poll so a bid is
 * never lost when a webhook is late or undelivered.
 */

type FulfilResult = {
  ok: boolean;
  entry_id?: string;
  total_cents?: number;
  rank?: number;
  already?: boolean;
};

function decode(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .trim();
}

/** Best-effort title/description scrape so board rows are not bare domains. */
export async function fetchSiteMeta(url: string): Promise<{ name?: string; description?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "StartupBarBot/1.0 (+https://startupbar.co)" },
    });
    clearTimeout(timer);
    if (!res.ok) return {};
    const html = (await res.text()).slice(0, 200_000);

    const og = (prop: string) => {
      const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`,
        "i",
      );
      const alt = new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`,
        "i",
      );
      return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? "";
    };

    const title = og("og:site_name") || og("og:title") || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "";
    const description = og("og:description") || og("description") || "";
    return {
      name: title ? decode(title).slice(0, 80) : undefined,
      description: description ? decode(description).slice(0, 240) : undefined,
    };
  } catch {
    return {};
  }
}

export async function fulfilBid(
  bidId: string,
  paymentId: string,
  email?: string | null,
): Promise<FulfilResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin.rpc("confirm_bid_payment" as never, {
    _bid_id: bidId,
    _payment_id: paymentId,
    _email: email ?? null,
  } as never);

  if (error) {
    console.error("[bid] confirm_bid_payment failed", error);
    return { ok: false };
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { entry_id: string; total_cents: number; rank: number; already: boolean }
    | undefined;
  if (!row?.entry_id) return { ok: false };

  // Enrich the entry once, right after its first successful payment.
  if (!row.already) {
    try {
      const { data: entry } = await supabaseAdmin
        .from("bid_entries")
        .select("id, target_url, description, name, startup_id, logo_url, url_key, user_id")
        .eq("id", row.entry_id)
        .maybeSingle();

      if (entry) {
        const patch: { startup_id?: string; description?: string; logo_url?: string; name?: string } = {};

        // Cross-promotion: link the entry to an approved network startup when
        // the domain matches, so the board can show the network badge.
        if (!entry.startup_id) {
          const host = String(entry.url_key).split("/")[0];
          const { data: match } = await supabaseAdmin
            .from("startups")
            .select("id, name, description, logo_url")
            .eq("status", "approved")
            .ilike("website_url", `%${host}%`)
            .limit(1)
            .maybeSingle();
          if (match) {
            patch.startup_id = match.id;
            if (!entry.description && match.description) patch.description = match.description;
            if (!entry.logo_url && match.logo_url) patch.logo_url = match.logo_url;
            if (match.name) patch.name = match.name;
          }
        }

        if (!patch.description && !entry.description) {
          const meta = await fetchSiteMeta(entry.target_url);
          if (meta.description) patch.description = meta.description;
          if (meta.name && !patch.name) patch.name = meta.name;
        }

        if (Object.keys(patch).length > 0) {
          await supabaseAdmin.from("bid_entries").update(patch).eq("id", entry.id);
        }
      }
    } catch (e) {
      console.error("[bid] entry enrichment failed", e);
    }
  }

  return { ok: true, entry_id: row.entry_id, total_cents: row.total_cents, rank: row.rank, already: row.already };
}

/** Look a payment up directly with Dodo (source of truth for the return poll). */
export async function getDodoPayment(paymentId: string): Promise<any | null> {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey || !paymentId) return null;
  try {
    const res = await fetch(
      `https://live.dodopayments.com/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    const raw = await res.text();
    return res.ok && raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
