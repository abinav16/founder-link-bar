import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { StartupFavicon } from "@/components/StartupFavicon";
import { BidDialog } from "@/components/bid/BidDialog";
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
} from "@/lib/bid";
import {
  ArrowUpRight,
  CheckCircle2,
  Crown,
  Flame,
  Gavel,
  Loader2,
  Sparkles,
  TrendingUp,
  Zap,
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-white/35">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-white tabular-nums">{value}</div>
    </div>
  );
}

function rankStyles(rank: number) {
  if (rank === 1)
    return {
      row: "sb-bid-gold border-[#e9c46a]/60",
      badge: "bg-[#e9c46a] text-black",
    };
  if (rank === 2)
    return { row: "border-white/20 bg-white/[0.06]", badge: "bg-white/85 text-black" };
  if (rank === 3)
    return { row: "border-[#c98b52]/40 bg-[#c98b52]/[0.09]", badge: "bg-[#c98b52] text-black" };
  return { row: "border-white/8 bg-white/[0.02]", badge: "bg-white/10 text-white/60" };
}

function BidRow({ entry, onOutbid }: { entry: BidEntry; onOutbid: (e: BidEntry) => void }) {
  const s = rankStyles(entry.rank);
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-4 py-3.5 transition-colors sm:px-5 ${s.row}`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold tabular-nums ${s.badge}`}
        >
          {entry.rank}
        </div>
        <StartupFavicon
          url={entry.target_url}
          name={entry.name}
          logoUrl={entry.logo_url}
          size={38}
          className="shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={entry.target_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              onClick={() => trackBidClick(entry.id)}
              className={`truncate text-[14.5px] font-semibold hover:underline ${
                entry.rank === 1 ? "text-black" : "text-white"
              }`}
            >
              {entry.name}
            </a>
            {entry.rank === 1 && <Crown className="h-3.5 w-3.5 shrink-0 text-black/70" />}
            {entry.on_network && (
              <span
                className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium sm:inline ${
                  entry.rank === 1
                    ? "border-black/20 text-black/70"
                    : "border-white/15 text-white/50"
                }`}
              >
                In network
              </span>
            )}
          </div>
          <p
            className={`truncate text-[12.5px] ${
              entry.rank === 1 ? "text-black/60" : "text-white/40"
            }`}
          >
            {entry.description || entry.display_url}
          </p>
        </div>

        <div className="hidden shrink-0 text-right sm:block">
          <div
            className={`text-[11px] uppercase tracking-wider ${
              entry.rank === 1 ? "text-black/50" : "text-white/30"
            }`}
          >
            Clicks
          </div>
          <div
            className={`text-[13px] font-semibold tabular-nums ${
              entry.rank === 1 ? "text-black" : "text-white/70"
            }`}
          >
            {entry.clicks.toLocaleString()}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div
            className={`text-[15px] font-bold tabular-nums ${
              entry.rank === 1 ? "text-black" : "text-white"
            }`}
          >
            {formatUsd(entry.total_cents)}
          </div>
          <button
            onClick={() => onOutbid(entry)}
            className={`mt-0.5 text-[11px] font-medium hover:underline ${
              entry.rank === 1 ? "text-black/60" : "text-[#e9c46a]"
            }`}
          >
            Outbid · {formatUsd(priceToClaim(entry.total_cents))}
          </button>
        </div>
      </div>
    </div>
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

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(
          `/api/public/bid-status?bid=${encodeURIComponent(bidId)}${
            paymentId ? `&payment_id=${encodeURIComponent(paymentId)}` : ""
          }`,
        );
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
      if (attempts >= 20) {
        setState({ status: "failed" });
        return;
      }
      setTimeout(poll, 3000);
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [bidId, paymentId, onDone]);

  return (
    <div className="mb-8 rounded-2xl border border-[#e9c46a]/30 bg-[#e9c46a]/[0.08] px-5 py-4">
      {state.status === "pending" && (
        <div className="flex items-center gap-3 text-white/70">
          <Loader2 className="h-4 w-4 animate-spin text-[#e9c46a]" />
          <span className="text-sm">Confirming your payment and placing your bid…</span>
        </div>
      )}
      {state.status === "paid" && (
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#e9c46a]" />
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
        <p className="text-sm text-white/70">
          We haven&apos;t seen the payment confirmation yet. If you were charged, your bid appears
          automatically within a few minutes — no action needed.
        </p>
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

  const [dialog, setDialog] = useState<{ open: boolean; url?: string; amount?: number }>({
    open: false,
  });

  const entries = board.data ?? [];
  const top = entries[0];

  const clearSearch = useMemo(
    () => () => {
      board.refetch();
      activity.refetch();
      stats.refetch();
      setTimeout(() => navigate({ to: "/startupbid", search: { bid: undefined, payment_id: undefined }, replace: true }), 6000);
    },
    [board, activity, stats, navigate],
  );

  return (
    <div className="min-h-screen bg-[#08080a]">
      <SiteHeader />

      <main className="bg-[#08080a] text-white">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/8">
          <div className="pointer-events-none absolute inset-0">
            <div className="sb-bid-orb absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#e9c46a]/20 blur-[120px]" />
            <div className="sb-bid-grid absolute inset-0 opacity-[0.18]" />
          </div>

          <div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#e9c46a]/30 bg-[#e9c46a]/10 px-3 py-1 text-[11px] font-medium tracking-wide text-[#e9c46a]">
              <Gavel className="h-3 w-3" /> STANDALONE · NO ACCOUNT NEEDED
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              StartupBid
              <span className="block text-white/35">The board money climbs.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/50">
              Bid on your spot. Bids are cumulative — every dollar stacks onto your total and pushes
              you up the ranking. Highest total wins the top slot, and everyone sees it live.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setDialog({ open: true })}
                className="group inline-flex items-center gap-2 rounded-xl bg-[#e9c46a] px-5 py-3 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5"
              >
                <Zap className="h-4 w-4" /> Place your bid
              </button>
              {top && (
                <button
                  onClick={() => setDialog({ open: true, amount: priceToClaim(top.total_cents) })}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-white/70 transition-colors hover:border-white/35 hover:text-white"
                >
                  <Crown className="h-4 w-4" /> Take #1 for {formatUsd(priceToClaim(top.total_cents))}
                </button>
              )}
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="On the board" value={(stats.data?.entries ?? 0).toLocaleString()} />
              <Stat label="Total bid" value={formatUsd(stats.data?.total_cents ?? 0)} />
              <Stat label="Top bid" value={formatUsd(stats.data?.top_cents ?? 0)} />
              <Stat label="Clicks sent" value={(stats.data?.total_clicks ?? 0).toLocaleString()} />
            </div>
          </div>
        </section>

        {/* Board */}
        <section className="mx-auto max-w-5xl px-6 py-12">
          {search.bid && (
            <SuccessBanner bidId={search.bid} paymentId={search.payment_id} onDone={clearSearch} />
          )}

          <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Live board
                </h2>
                <div className="h-px flex-1 bg-white/8" />
                <span className="flex items-center gap-1.5 text-[11px] text-white/30">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e9c46a]" /> updating
                </span>
              </div>

              {board.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-[70px] animate-pulse rounded-2xl bg-white/[0.04]" />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/12 px-6 py-14 text-center">
                  <Sparkles className="mx-auto h-5 w-5 text-[#e9c46a]" />
                  <p className="mt-3 text-sm font-medium text-white">The board is empty.</p>
                  <p className="mt-1 text-[13px] text-white/40">
                    Bid $5 and you own the #1 slot until someone outbids you.
                  </p>
                  <button
                    onClick={() => setDialog({ open: true })}
                    className="mt-5 rounded-xl bg-[#e9c46a] px-4 py-2.5 text-sm font-semibold text-black"
                  >
                    Claim #1
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((e) => (
                    <BidRow
                      key={e.id}
                      entry={e}
                      onOutbid={(x) =>
                        setDialog({
                          open: true,
                          url: x.display_url,
                          amount: priceToClaim(x.total_cents),
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Side rail */}
            <aside className="space-y-8">
              <div>
                <h3 className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  <Flame className="h-3.5 w-3.5 text-[#e9c46a]" /> Hot right now
                </h3>
                <div className="space-y-2">
                  {(trending.data ?? []).length === 0 && (
                    <p className="text-[12.5px] text-white/30">No clicks in the last hour yet.</p>
                  )}
                  {(trending.data ?? []).map((t) => (
                    <div
                      key={t.entry_id}
                      className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2"
                    >
                      <StartupFavicon url={t.display_url} name={t.name} logoUrl={t.logo_url} size={22} className="rounded-md" />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/75">{t.name}</span>
                      <span className="flex items-center gap-1 text-[11px] tabular-nums text-[#e9c46a]">
                        <TrendingUp className="h-3 w-3" />
                        {t.clicks_hour}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Recent bids
                </h3>
                <div className="space-y-3">
                  {(activity.data ?? []).length === 0 && (
                    <p className="text-[12.5px] text-white/30">No bids yet — be the first.</p>
                  )}
                  {(activity.data ?? []).map((a, i) => (
                    <div key={`${a.entry_id}-${i}`} className="flex items-start gap-2.5">
                      <StartupFavicon url={a.display_url} name={a.name} logoUrl={a.logo_url} size={20} className="mt-0.5 rounded-md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] text-white/70">
                          <span className="text-white">{a.name}</span> bid{" "}
                          <span className="font-semibold text-[#e9c46a]">{formatUsd(a.amount_cents)}</span>
                        </p>
                        <p className="text-[11px] text-white/25">{timeAgo(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <h3 className="text-[12.5px] font-semibold text-white">How it works</h3>
                <ol className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-white/45">
                  <li>1. Enter any site or @handle — yours or one you back.</li>
                  <li>2. Pay any amount from $5. It adds to that entry&apos;s total.</li>
                  <li>3. Ranking is pure total spend. Outbid anyone, anytime.</li>
                  <li>4. Clicks from the board are counted and shown publicly.</li>
                </ol>
                <p className="mt-3 text-[11px] leading-relaxed text-white/25">
                  Bids are final and non-refundable. StartupBid is separate from the StartupBar
                  widget network — no install required.
                </p>
              </div>

              <Link
                to="/network"
                className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-[12.5px] text-white/55 transition-colors hover:border-white/20 hover:text-white"
              >
                Want free traffic instead? See the network
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </aside>
          </div>
        </section>
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
