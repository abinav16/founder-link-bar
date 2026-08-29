import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

import { StartupFavicon } from "@/components/StartupFavicon";
import { BidDialog } from "@/components/bid/BidDialog";
import { InlineBidForm } from "@/components/bid/InlineBidForm";
import {
  formatUsd,
  priceToClaim,
  timeAgo,
  trackBidClick,
  withBidUtm,
  useBidActivity,
  useBidBoard,
  useBidStats,
  useBidTrending,
  type BidEntry,
  type BidActivity,
  type BidTrending,
} from "@/lib/bid";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Flame,
  Gavel,
  Globe,
  Loader2,
  MousePointerClick,
  Trophy,
} from "lucide-react";


const TITLE = "StartupBid — Pay-to-rank leaderboard for startups | StartupBar";
const DESCRIPTION =
  "Bid to rank your startup on StartupBid. Bids are cumulative, the board is live, and anyone can join — no account required. Every click is tracked and shown publicly.";

export const Route = createFileRoute("/startupbid")({
  validateSearch: (search: Record<string, unknown>): { bid?: string; payment_id?: string } => ({
    ...(typeof search.bid === "string" ? { bid: search.bid } : {}),
    ...(typeof search.payment_id === "string" ? { payment_id: search.payment_id } : {}),
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StartupBidPage,
});

function PillStat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        style={{
          color: "white",
          fontSize: small ? 16 : 22,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          color: "rgba(255,255,255,0.35)",
          fontSize: small ? 7 : 9,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function PillStatSkeleton({ small }: { small?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="animate-pulse rounded-full bg-white/25"
        style={{ height: small ? 14 : 18, width: small ? 34 : 48 }}
      />
      <div
        className="animate-pulse rounded-full bg-white/10"
        style={{ height: small ? 6 : 8, width: small ? 34 : 52 }}
      />
    </div>
  );
}

function HeroActivitySkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-2.5">
          <div className="h-7 w-7 shrink-0 animate-pulse rounded-lg bg-white/10" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-white/15" />
            <div className="h-2 w-1/3 animate-pulse rounded-full bg-white/8" />
          </div>
        </div>
      ))}
    </div>
  );
}

function bidHref(displayUrl: string): string {
  if (displayUrl.startsWith("@")) return `https://x.com/${displayUrl.slice(1)}`;
  if (/^https?:\/\//i.test(displayUrl)) return withBidUtm(displayUrl);
  return withBidUtm(`https://${displayUrl}`);
}

function TrendingNow({ items, loading }: { items: BidTrending[]; loading: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-[#0a0a0a] p-3 text-left shadow-[0_8px_32px_rgba(0,0,0,0.4)] sm:p-4">
      <div className="mb-3 flex items-center gap-1.5 text-white/45">
        <Flame className="h-3.5 w-3.5" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em]">Trending now</span>
      </div>
      {loading ? (
        <HeroActivitySkeleton />
      ) : items.length === 0 ? (
        <p className="text-[11px] text-white/35">Clicks will appear here live.</p>
      ) : (
        <div className="space-y-2.5">
          {items.slice(0, 3).map((item, index) => (
            <a
              key={item.entry_id}
              href={bidHref(item.display_url)}
              target="_blank"
              rel="noopener nofollow"
              onClick={() => trackBidClick(item.entry_id)}
              className="grid min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg transition-colors hover:bg-white/[0.06]"
            >
              <StartupFavicon
                url={item.display_url}
                name={item.name}
                logoUrl={item.logo_url}
                size={26}
                className="shrink-0 rounded-lg"
              />
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-semibold text-white">{item.name}</p>
                <p className="text-[9.5px] text-white/35">#{index + 1} trending</p>
              </div>
              <span className="shrink-0 text-[10.5px] font-semibold tabular-nums text-white/65">
                {item.clicks_hour.toLocaleString()} clicks
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentPurchases({ items, loading }: { items: BidActivity[]; loading: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-[#0a0a0a] p-3 text-left shadow-[0_8px_32px_rgba(0,0,0,0.4)] sm:p-4">
      <div className="mb-3 flex items-center gap-1.5 text-white/45">
        <Clock3 className="h-3.5 w-3.5" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em]">Recent activity</span>
      </div>
      {loading ? (
        <HeroActivitySkeleton />
      ) : items.length === 0 ? (
        <p className="text-[11px] text-white/35">New purchases will appear here.</p>
      ) : (
        <div className="space-y-2.5">
          {items.slice(0, 3).map((item, index) => (
            <a
              key={`${item.entry_id}-${item.created_at}-${index}`}
              href={bidHref(item.display_url)}
              target="_blank"
              rel="noopener nofollow"
              onClick={() => trackBidClick(item.entry_id)}
              className="grid min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg transition-colors hover:bg-white/[0.06]"
            >
              <StartupFavicon
                url={item.display_url}
                name={item.name}
                logoUrl={item.logo_url}
                size={26}
                className="shrink-0 rounded-lg"
              />
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-semibold text-white">{item.name}</p>
                <p className="truncate text-[9.5px] text-white/35">{timeAgo(item.created_at)}</p>
              </div>
              <span className="shrink-0 text-[10.5px] font-semibold tabular-nums text-white/70">
                +{formatUsd(item.amount_cents)}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}


function HeroStats({ loading, stats }: { loading: boolean; stats: ReturnType<typeof useBidStats>["data"] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-center gap-2 border-b border-white/10 px-4 py-3">
        <Gavel className="h-4 w-4 text-white" />
        <span className="text-[16px] font-extrabold leading-none text-white">StartupBid</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-white/10">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="px-3 py-3"><PillStatSkeleton small /></div>
          ))
        ) : (
          <>
            <div className="px-3 py-3"><PillStat small label="Board" value={(stats?.entries ?? 0).toLocaleString()} /></div>
            <div className="px-3 py-3"><PillStat small label="Total bid" value={formatUsd(stats?.total_cents ?? 0)} /></div>
            <div className="px-3 py-3"><PillStat small label="Clicks" value={(stats?.total_clicks ?? 0).toLocaleString()} /></div>
            <div className="px-3 py-3"><PillStat small label="Top bid" value={formatUsd(stats?.top_cents ?? 0)} /></div>
          </>
        )}
      </div>
    </div>
  );
}

const PODIUM = [
  {
    card: "border-black/80 bg-black text-white shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]",
    badge: "bg-white text-black",
    name: "text-white",
    desc: "text-white/60",
    meta: "text-white/45",
    amount: "text-white",
    outbid: "text-white/55 hover:text-white",
    pad: "px-5 py-5 sm:px-6 sm:py-6",
    logo: 60,
    nameSize: "text-[19px] sm:text-[21px]",
    badgeSize: "h-11 w-11 text-[15px]",
  },
  {
    card: "border-black/25 bg-black/[0.055] text-black",
    badge: "bg-black text-white",
    name: "text-black",
    desc: "text-black/55",
    meta: "text-black/40",
    amount: "text-black",
    outbid: "text-black/45 hover:text-black",
    pad: "px-5 py-4.5 sm:px-6 sm:py-5",
    logo: 52,
    nameSize: "text-[17px] sm:text-[19px]",
    badgeSize: "h-10 w-10 text-[14px]",
  },
  {
    card: "border-black/12 bg-black/[0.025] text-black",
    badge: "bg-black/80 text-white",
    name: "text-black",
    desc: "text-black/50",
    meta: "text-black/40",
    amount: "text-black",
    outbid: "text-black/45 hover:text-black",
    pad: "px-5 py-4 sm:px-6 sm:py-4.5",
    logo: 46,
    nameSize: "text-[16px] sm:text-[17px]",
    badgeSize: "h-9 w-9 text-[13px]",
  },
];

function outbidSuffix(rank: number): string {
  return rank === 1 ? "· take #1" : `→ #${rank}`;
}

function PodiumRow({ entry, onOutbid }: { entry: BidEntry; onOutbid: (e: BidEntry) => void }) {
  const s = PODIUM[Math.min(entry.rank, 3) - 1] ?? PODIUM[2];
  return (
    <a
      href={withBidUtm(entry.target_url)}
      target="_blank"
      rel="noopener nofollow"
      onClick={() => trackBidClick(entry.id)}
      className={`block cursor-pointer rounded-2xl border transition-transform hover:-translate-y-0.5 ${s.card} ${s.pad}`}
    >
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <div
          className={`flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums ${s.badge} ${s.badgeSize}`}
        >
          #{entry.rank}
        </div>

        <StartupFavicon
          url={entry.target_url}
          name={entry.name}
          logoUrl={entry.logo_url}
          size={s.logo}
          className="hidden shrink-0 rounded-xl sm:block"
        />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <StartupFavicon
              url={entry.target_url}
              name={entry.name}
              logoUrl={entry.logo_url}
              size={26}
              className="shrink-0 rounded-lg sm:hidden"
            />
            <span
              className={`truncate font-bold tracking-tight ${s.name} ${s.nameSize}`}
            >
              {entry.name}
            </span>
          </div>
          <p className={`mt-1 line-clamp-2 text-[12.5px] leading-snug sm:text-[13px] ${s.desc}`}>
            {entry.description || entry.display_url}
          </p>
          <div className={`mt-1.5 hidden text-[11.5px] font-medium tabular-nums sm:block ${s.meta}`}>
            {entry.clicks.toLocaleString()} clicks
          </div>
        </div>

        <div className="hidden shrink-0 text-right sm:block">
          <div className={`text-[18px] font-bold tabular-nums sm:text-[20px] ${s.amount}`}>
            {formatUsd(entry.total_cents)}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOutbid(entry); }}
            className={`mt-0.5 text-[11.5px] font-medium hover:underline ${s.outbid}`}
          >
            Outbid · {formatUsd(priceToClaim(entry.total_cents))} {outbidSuffix(entry.rank)}
          </button>
        </div>
      </div>

      {/* Mobile footer: amount + outbid CTA */}
      <div className="mt-3 flex items-center justify-between gap-3 sm:hidden">
        <div className={`text-[11.5px] font-medium tabular-nums ${s.meta}`}>
          {entry.clicks.toLocaleString()} clicks
        </div>
        <div className="flex items-center gap-2.5">
          <div className={`text-[18px] font-bold leading-none tabular-nums ${s.amount}`}>
            {formatUsd(entry.total_cents)}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOutbid(entry); }}
            className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${
              entry.rank === 1
                ? "bg-white text-black"
                : "bg-black text-white"
            }`}
          >
            Outbid · {formatUsd(priceToClaim(entry.total_cents))} {outbidSuffix(entry.rank)}
          </button>
        </div>
      </div>
    </a>
  );
}


function BidRow({ entry, onOutbid }: { entry: BidEntry; onOutbid: (e: BidEntry) => void }) {
  return (
    <a
      href={withBidUtm(entry.target_url)}
      target="_blank"
      rel="noopener nofollow"
      onClick={() => trackBidClick(entry.id)}
      className="flex cursor-pointer items-center gap-3 border-b border-black/[0.06] px-4 py-3.5 transition-colors last:border-0 hover:bg-black/[0.015] sm:gap-4 sm:px-5"
    >
      <div className="w-6 shrink-0 text-[13px] font-semibold tabular-nums text-black/35">
        {entry.rank}
      </div>

      <StartupFavicon
        url={entry.target_url}
        name={entry.name}
        logoUrl={entry.logo_url}
        size={36}
        className="shrink-0 rounded-lg"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-semibold text-black">
            {entry.name}
          </span>
          {entry.on_network && (
            <span className="hidden shrink-0 rounded-full border border-black/10 px-2 py-0.5 text-[10px] font-medium text-black/45 sm:inline">
              In network
            </span>
          )}
        </div>
        <p className="truncate text-[12.5px] text-black/45">
          {entry.description || entry.display_url}
        </p>
        <div className="mt-0.5 text-[11px] tabular-nums text-black/35 sm:hidden">
          {entry.clicks.toLocaleString()} clicks
        </div>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <div className="text-[11px] uppercase tracking-wider text-black/35">Clicks</div>
        <div className="text-[13px] font-medium tabular-nums text-black/70">
          {entry.clicks.toLocaleString()}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="text-[15px] font-semibold leading-none tabular-nums text-black">
          {formatUsd(entry.total_cents)}
        </div>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOutbid(entry); }}
          className="whitespace-nowrap rounded-full border border-black/12 px-2.5 py-1 text-[11px] font-medium text-black/60 transition-colors hover:border-black hover:text-black sm:border-0 sm:px-0 sm:py-0 sm:hover:underline"
        >
          Outbid · {formatUsd(priceToClaim(entry.total_cents))} {outbidSuffix(entry.rank)}
        </button>
      </div>

    </a>
  );
}

function SuccessBanner({
  bidId,
  paymentId,
  onDone,
}: {
  bidId: string;
  paymentId?: string;
  onDone: () => void;
}) {
  const [state, setState] = useState<{ status: "pending" | "paid" | "failed"; data?: any }>({
    status: "pending",
  });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setState({ status: "pending" });
    const poll = async () => {
      attempts += 1;
      try {
        const controller = new AbortController();
        const requestTimeout = setTimeout(() => controller.abort(), 10_000);
        const res = await fetch(
          `/api/public/bid-status?bid=${encodeURIComponent(bidId)}${
            paymentId ? `&payment_id=${encodeURIComponent(paymentId)}` : ""
          }`,
          { cache: "no-store", signal: controller.signal },
        );
        clearTimeout(requestTimeout);
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (json?.status === "paid") {
          setState({ status: "paid", data: json });
          onDone();
          // Scrape title/description in the background, then refresh the board
          // so the new row shows real copy instead of just the domain.
          void fetch("/api/public/bid-enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bid_id: bidId }),
          })
            .then(() => {
              if (!cancelled) onDone();
            })
            .catch(() => {});
          return;
        }
      } catch {
        /* keep polling */
      }
      if (cancelled) return;
      if (attempts >= 40) {
        setState({ status: "failed" });
        return;
      }
      timer = setTimeout(poll, attempts < 12 ? 1000 : 2500);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [bidId, paymentId, onDone, tick]);

  return (
    <div className="mb-6 rounded-2xl border border-black/[0.08] bg-white px-5 py-4">
      {state.status === "pending" && (
        <div className="flex items-center gap-3 text-black/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Confirming your payment and placing your bid…</span>
        </div>
      )}
      {state.status === "paid" && (
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-black" />
          <div>
            <p className="text-sm font-semibold text-black">
              You&apos;re live at #{state.data?.rank} with {formatUsd(state.data?.total_cents ?? 0)}
            </p>
            <p className="mt-0.5 text-[13px] text-black/50">
              {state.data?.display_url} is on the board. Add more anytime to climb higher.
            </p>
          </div>
        </div>
      )}
      {state.status === "failed" && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-black/60">
            We haven&apos;t seen the payment confirmation yet. If you were charged, your bid appears
            automatically within a few minutes.
          </p>
          <button
            onClick={() => setTick((t) => t + 1)}
            className="rounded-full bg-black px-4 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
          >
            Check again
          </button>
        </div>
      )}
    </div>
  );
}

function StartupBidPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const board = useBidBoard();
  const activity = useBidActivity();
  const trending = useBidTrending();
  const stats = useBidStats();

  useEffect(() => {
    // This page previously scrolled the payment banner into view on mount,
    // which also overrode the expected top position after a reload.
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => {
      window.cancelAnimationFrame(frame);
      window.history.scrollRestoration = previous;
    };
  }, []);

  const [howStep, setHowStep] = useState(0);
  const [dialog, setDialog] = useState<{ open: boolean; url?: string; amount?: number }>({
    open: false,
  });

  const entries = board.data ?? [];

  const top = entries[0];

  const clearSearch = useCallback(() => {
    void board.refetch();
    void activity.refetch();
    void stats.refetch();
    window.setTimeout(() => {
      void navigate({
        to: "/startupbid",
        search: { bid: undefined, payment_id: undefined },
        replace: true,
        resetScroll: false,
      });
    }, 6000);
  }, [board.refetch, activity.refetch, stats.refetch, navigate]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 pb-8 pt-4 sm:px-6 sm:pb-12 sm:pt-5">
        {/* Hero */}
        <header className="text-center">
          <h1 className="text-[32px] font-semibold tracking-tight text-black sm:text-5xl">
            StartupBid
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-[13.5px] leading-relaxed text-black/50 sm:text-[15px]">
            Pay to rank. Bids are cumulative, every dollar stacks onto your total and pushes you up
            the board. Highest total sits at #1.
          </p>

          <div className="mt-6">
            <div className="grid grid-cols-1 items-stretch gap-2.5 sm:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)] sm:gap-4">
              <div className="hidden min-w-0 sm:order-1 sm:block">
                <TrendingNow items={trending.data ?? []} loading={trending.isLoading} />
              </div>
              <div className="mx-auto w-[190px] sm:order-2 sm:mx-0 sm:w-auto">
                <HeroStats loading={stats.isLoading} stats={stats.data} />
              </div>
              <div className="hidden min-w-0 sm:order-3 sm:block">
                <RecentPurchases items={activity.data ?? []} loading={activity.isLoading} />
              </div>
            </div>
          </div>

          <InlineBidForm board={entries} />

        </header>

        {/* Board */}
        <section className="mt-10 sm:mt-12">
          {search.bid && (
            <SuccessBanner bidId={search.bid} paymentId={search.payment_id} onDone={clearSearch} />
          )}

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-black/40">
              The board
            </h2>
            <span className="text-[11px] text-black/35">Ranked by total spend</span>
          </div>

          {board.isLoading ? (
            <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-b border-black/[0.04] px-5 py-4 last:border-0"
                >
                  <div className="h-3 w-4 animate-pulse rounded-full bg-black/[0.05]" />
                  <div className="h-9 w-9 animate-pulse rounded-lg bg-black/[0.05]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/4 animate-pulse rounded-full bg-black/[0.05]" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-black/[0.03]" />
                  </div>
                  <div className="h-4 w-14 animate-pulse rounded-full bg-black/[0.05]" />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-2xl border border-black/[0.07] bg-white px-6 py-16 text-center">
              <p className="text-sm font-medium text-black">The board is empty.</p>
              <p className="mt-1 text-[13px] text-black/45">
                Bid $5 and you own #1 until someone outbids you.
              </p>
              <button
                onClick={() => setDialog({ open: true })}
                className="mt-5 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white"
              >
                Claim #1
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {entries.slice(0, 3).map((e) => (
                  <PodiumRow
                    key={e.id}
                    entry={e}
                    onOutbid={(x) =>
                      window.dispatchEvent(
                        new CustomEvent("sb:outbid", {
                          detail: {
                            cents: priceToClaim(x.total_cents),
                            targetTotal: x.total_cents,
                            displayUrl: x.display_url,
                            name: x.name,
                          },
                        }),
                      )
                    }
                  />
                ))}
              </div>

              {entries.length > 3 && (
                <>
                  <div className="my-6 flex items-center gap-4">
                    <div className="h-px flex-1 bg-black/10" />
                    <span className="rounded-full border border-black/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">
                      Top 3
                    </span>
                    <div className="h-px flex-1 bg-black/10" />
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
                    {entries.slice(3).map((e) => (
                      <BidRow
                        key={e.id}
                        entry={e}
                        onOutbid={(x) =>
                          window.dispatchEvent(
                            new CustomEvent("sb:outbid", {
                              detail: {
                            cents: priceToClaim(x.total_cents),
                            targetTotal: x.total_cents,
                            displayUrl: x.display_url,
                            name: x.name,
                          },
                            }),
                          )
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        {/* Mobile: trending + recent activity below the board */}
        <section className="mt-8 grid grid-cols-1 gap-3 sm:hidden">
          <TrendingNow items={trending.data ?? []} loading={trending.isLoading} />
          <RecentPurchases items={activity.data ?? []} loading={activity.isLoading} />
        </section>



        {/* How it works */}
        <section className="mt-10 sm:mt-12">
          <div className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6">
            <h3 className="text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-black/40">
              How it works
            </h3>

            <ol
              onScroll={(e) => {
                const el = e.currentTarget;
                const card = el.querySelector("li");
                if (!card) return;
                const w = (card as HTMLElement).offsetWidth + 12;
                setHowStep(Math.min(2, Math.max(0, Math.round(el.scrollLeft / w))));
              }}
              className="scrollbar-none -mx-5 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:mt-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0"
            >
              {[
                {
                  icon: Globe,
                  step: "01",
                  title: "Add a site or @handle",
                  body: "Enter any website or X handle — yours or one you back. No account needed.",
                },
                {
                  icon: CreditCard,
                  step: "02",
                  title: "Bid from $5",
                  body: "Every payment stacks onto that entry's lifetime total. Bids are cumulative.",
                },
                {
                  icon: Trophy,
                  step: "03",
                  title: "Climb the board",
                  body: "Ranking is pure total spend. Outbid anyone, anytime to take their spot.",
                },
              ].map((s) => (
                <li
                  key={s.step}
                  className="group relative flex w-[86%] shrink-0 snap-center items-start gap-3.5 rounded-xl border border-black/[0.06] bg-[#fafafa] p-4 transition-all duration-200 first:ml-0 last:mr-0 hover:border-black/[0.12] hover:bg-white hover:shadow-[0_6px_20px_-10px_rgba(0,0,0,0.12)] sm:w-auto sm:shrink sm:flex-col sm:gap-0 sm:p-5"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-white transition-transform duration-200 group-hover:scale-110 sm:h-11 sm:w-11">
                    <s.icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2 sm:mt-3.5">
                      <span className="font-mono text-[10px] font-semibold tracking-widest text-black/30">
                        {s.step}
                      </span>
                      <h4 className="truncate text-[13.5px] font-semibold tracking-tight text-black">
                        {s.title}
                      </h4>
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-black/50">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            {/* Mobile swipe dots */}
            <div aria-hidden className="mt-3 flex items-center justify-center gap-1.5 sm:hidden">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    howStep === i ? "w-4 bg-black" : "w-1.5 bg-black/20"
                  }`}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11.5px] font-medium text-black/40">
              <MousePointerClick className="h-3.5 w-3.5" />
              Clicks from the board are counted and shown publicly.
            </div>

            <p className="mt-4 border-t border-black/[0.05] pt-4 text-[11px] leading-relaxed text-black/30">
              StartupBid is a paid advertising placement, not a contest, prize draw or game of
              chance. Your listing goes live immediately after payment and stays on the board with
              public click tracking. Ranking is decided purely by the total amount paid. Payments
              are processed by Dodo Payments, our merchant of record; refund requests are handled
              under their policy. StartupBid is separate from the StartupBar widget network — no
              install required.
            </p>

          </div>
        </section>

        <Link
          to="/network"
          className="mt-6 flex items-center justify-between rounded-2xl border border-black/[0.07] bg-white px-5 py-4 text-[13px] text-black/55 transition-colors hover:border-black/20 hover:text-black"
        >
          Want free traffic instead? See the network
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </main>

      <SiteFooter />



      <BidDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false })}
        board={entries}
        initialUrl={dialog.url}
        initialAmountCents={dialog.amount}
      />
    </div>
  );
}
