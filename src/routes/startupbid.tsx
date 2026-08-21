import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { StartupFavicon } from "@/components/StartupFavicon";
import { BidDialog } from "@/components/bid/BidDialog";
import { InlineBidForm } from "@/components/bid/InlineBidForm";
import {
  formatUsd,
  priceToClaim,
  timeAgo,
  trackBidClick,
  useBidActivity,
  useBidBoard,
  useBidStats,
  useBidTrending,
  type BidEntry,
  type BidActivity,
  type BidTrending,
} from "@/lib/bid";
import { ArrowUpRight, CheckCircle2, Clock3, Flame, Gavel, Loader2 } from "lucide-react";


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
  if (/^https?:\/\//i.test(displayUrl)) return displayUrl;
  return `https://${displayUrl}`;
}

function TrendingNow({ items, loading }: { items: BidTrending[]; loading: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md sm:p-4">
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
              rel="noopener noreferrer nofollow"
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
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md sm:p-4">
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
              rel="noopener noreferrer nofollow"
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
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
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
    card: "border-white/15 bg-white/[0.06] text-white shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]",
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
    card: "border-white/10 bg-white/[0.03] text-white",
    badge: "bg-white text-black",
    name: "text-white",
    desc: "text-white/55",
    meta: "text-white/40",
    amount: "text-white",
    outbid: "text-white/45 hover:text-white",
    pad: "px-5 py-4.5 sm:px-6 sm:py-5",
    logo: 52,
    nameSize: "text-[17px] sm:text-[19px]",
    badgeSize: "h-10 w-10 text-[14px]",
  },
  {
    card: "border-white/[0.06] bg-white/[0.02] text-white",
    badge: "bg-white text-black",
    name: "text-white",
    desc: "text-white/50",
    meta: "text-white/40",
    amount: "text-white",
    outbid: "text-white/45 hover:text-white",
    pad: "px-5 py-4 sm:px-6 sm:py-4.5",
    logo: 46,
    nameSize: "text-[16px] sm:text-[17px]",
    badgeSize: "h-9 w-9 text-[13px]",
  },
];

function PodiumRow({ entry, onOutbid }: { entry: BidEntry; onOutbid: (e: BidEntry) => void }) {
  const s = PODIUM[Math.min(entry.rank, 3) - 1] ?? PODIUM[2];
  return (
    <a
      href={entry.target_url}
      target="_blank"
      rel="noopener noreferrer nofollow"
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
            Outbid · {formatUsd(priceToClaim(entry.total_cents))}
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
                : "bg-white text-black"
            }`}
          >
            Outbid · {formatUsd(priceToClaim(entry.total_cents))}
          </button>
        </div>
      </div>
    </a>
  );
}


function BidRow({ entry, onOutbid }: { entry: BidEntry; onOutbid: (e: BidEntry) => void }) {
  return (
    <a
      href={entry.target_url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={() => trackBidClick(entry.id)}
      className="flex cursor-pointer items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 transition-colors last:border-0 hover:bg-white/[0.06] sm:gap-4 sm:px-5"
    >
      <div className="w-6 shrink-0 text-[13px] font-semibold tabular-nums text-white/35">
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
          <span className="truncate text-[14px] font-semibold text-white">
            {entry.name}
          </span>
          {entry.on_network && (
            <span className="hidden shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium text-white/45 sm:inline">
              In network
            </span>
          )}
        </div>
        <p className="truncate text-[12.5px] text-white/45">
          {entry.description || entry.display_url}
        </p>
        <div className="mt-0.5 text-[11px] tabular-nums text-white/35 sm:hidden">
          {entry.clicks.toLocaleString()} clicks
        </div>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <div className="text-[11px] uppercase tracking-wider text-white/35">Clicks</div>
        <div className="text-[13px] font-medium tabular-nums text-white/70">
          {entry.clicks.toLocaleString()}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="text-[15px] font-semibold leading-none tabular-nums text-white">
          {formatUsd(entry.total_cents)}
        </div>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOutbid(entry); }}
          className="whitespace-nowrap rounded-full border border-white/12 px-2.5 py-1 text-[11px] font-medium text-white/60 transition-colors hover:border-white hover:text-white sm:border-0 sm:px-0 sm:py-0 sm:hover:underline"
        >
          Outbid · {formatUsd(priceToClaim(entry.total_cents))}
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
    <div className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-4">
      {state.status === "pending" && (
        <div className="flex items-center gap-3 text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Confirming your payment and placing your bid…</span>
        </div>
      )}
      {state.status === "paid" && (
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-white" />
          <div>
            <p className="text-sm font-semibold text-white">
              You&apos;re live at #{state.data?.rank} with {formatUsd(state.data?.total_cents ?? 0)}
            </p>
            <p className="mt-0.5 text-[13px] text-white/50">
              {state.data?.display_url} is on the board. Add more anytime to climb higher.
            </p>
          </div>
        </div>
      )}
      {state.status === "failed" && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-white/60">
            We haven&apos;t seen the payment confirmation yet. If you were charged, your bid appears
            automatically within a few minutes.
          </p>
          <button
            onClick={() => setTick((t) => t + 1)}
            className="rounded-full bg-white px-4 py-1.5 text-[12px] font-semibold text-black transition-opacity hover:opacity-85"
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
    <div className="min-h-screen bg-[#0a0a0a]">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 pb-8 pt-4 sm:px-6 sm:pb-12 sm:pt-5">
        {/* Hero */}
        <header className="text-center">
          <h1 className="text-[32px] font-semibold tracking-tight text-white sm:text-5xl">
            StartupBid
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-[13.5px] leading-relaxed text-white/50 sm:text-[15px]">
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
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/40">
              The board
            </h2>
            <span className="text-[11px] text-white/35">Ranked by total spend</span>
          </div>

          {board.isLoading ? (
            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-b border-white/[0.04] px-5 py-4 last:border-0"
                >
                  <div className="h-3 w-4 animate-pulse rounded-full bg-white/[0.06]" />
                  <div className="h-9 w-9 animate-pulse rounded-lg bg-white/[0.06]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/4 animate-pulse rounded-full bg-white/[0.06]" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-white/[0.04]" />
                  </div>
                  <div className="h-4 w-14 animate-pulse rounded-full bg-white/[0.06]" />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-16 text-center">
              <p className="text-sm font-medium text-white">The board is empty.</p>
              <p className="mt-1 text-[13px] text-white/45">
                Bid $5 and you own #1 until someone outbids you.
              </p>
              <button
                onClick={() => setDialog({ open: true })}
                className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
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
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                      Top 3
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
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
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/40">
              How it works
            </h3>
            <ol className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-white/55">
              <li>1. Enter any site or @handle — yours or one you back.</li>
              <li>2. Pay any amount from $5. It adds to that entry&apos;s total.</li>
              <li>3. Ranking is pure total spend. Outbid anyone, anytime.</li>
              <li>4. Clicks from the board are counted and shown publicly.</li>
            </ol>
            <p className="mt-3 text-[11px] leading-relaxed text-white/30">
              Bids are final and non-refundable. StartupBid is separate from the StartupBar widget
              network — no install required.
            </p>
          </div>
        </section>

        <Link
          to="/network"
          className="mt-6 flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4 text-[13px] text-white/55 transition-colors hover:border-white/20 hover:text-white"
        >
          Want free traffic instead? See the network
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </main>

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
