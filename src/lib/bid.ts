import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Minimum amount for a brand-new entry, in cents. */
export const BID_MIN_CENTS = 500;
/** Minimum step to take a rank above an existing entry, in cents. */
export const BID_STEP_CENTS = 100;

export type BidEntry = {
  id: string;
  rank: number;
  url_key: string;
  display_url: string;
  target_url: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  total_cents: number;
  first_bid_at: string;
  last_bid_at: string;
  clicks: number;
  on_network: boolean;
  startup_slug: string | null;
};

export type BidActivity = {
  entry_id: string;
  name: string;
  display_url: string;
  logo_url: string | null;
  amount_cents: number;
  created_at: string;
  rank: number | null;
};

export type BidTrending = {
  entry_id: string;
  name: string;
  display_url: string;
  logo_url: string | null;
  clicks_hour: number;
};

export type BidStats = {
  entries: number;
  total_cents: number;
  top_cents: number;
  total_clicks: number;
};

/** Normalised key for a bid target. Twitter/X handles keep their `@`. */
export function normalizeBidUrl(raw: string): {
  ok: boolean;
  urlKey: string;
  displayUrl: string;
  targetUrl: string;
  name: string;
} {
  const value = (raw || "").trim();
  const fail = { ok: false, urlKey: "", displayUrl: "", targetUrl: "", name: "" };
  if (!value) return fail;

  if (value.startsWith("@")) {
    const handle = value.slice(1).replace(/[^A-Za-z0-9_]/g, "");
    if (handle.length < 2) return fail;
    return {
      ok: true,
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
    return fail;
  }
  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  if (!host.includes(".") || host.length < 4) return fail;
  // One entry per site: the path is ignored so the same domain can never
  // appear twice on the board — extra bids stack onto the existing total.
  return {
    ok: true,
    urlKey: host,
    displayUrl: host,
    targetUrl: `https://${host}`,
    name: host,
  };
}

export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await supabase.rpc(name as never, (args ?? {}) as never);
  if (error) {
    console.error(`[bid] ${name} failed`, error);
    return [];
  }
  return (data ?? []) as unknown as T[];
}

export function useBidBoard() {
  return useQuery({
    queryKey: ["bid-board"],
    queryFn: () => rpc<BidEntry>("public_bid_board"),
    refetchInterval: 30_000,
  });
}

export function useBidActivity() {
  return useQuery({
    queryKey: ["bid-activity"],
    queryFn: () => rpc<BidActivity>("public_bid_activity", { _limit: 12 }),
    refetchInterval: 20_000,
  });
}

export function useBidTrending() {
  return useQuery({
    queryKey: ["bid-trending"],
    queryFn: () => rpc<BidTrending>("public_bid_trending", { _limit: 5 }),
    refetchInterval: 60_000,
  });
}

export function useBidStats() {
  return useQuery({
    queryKey: ["bid-stats"],
    queryFn: async () => (await rpc<BidStats>("public_bid_stats"))[0] ?? null,
    refetchInterval: 60_000,
  });
}

export async function trackBidClick(entryId: string) {
  try {
    let sid = "";
    try {
      sid = sessionStorage.getItem("sb_sid") ?? "";
      if (!sid) {
        sid = Math.random().toString(36).slice(2);
        sessionStorage.setItem("sb_sid", sid);
      }
    } catch {
      /* storage blocked */
    }
    await supabase.rpc("public_bid_click" as never, { _entry_id: entryId, _session: sid } as never);
  } catch {
    /* click tracking must never block the outbound link */
  }
}

/** Amount (in cents) required to take the position currently held by `entry`. */
export function priceToClaim(totalCents: number): number {
  return Math.max(totalCents + BID_STEP_CENTS, BID_MIN_CENTS);
}
