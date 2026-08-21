import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  type BidEntry,
} from "@/lib/bid";
import { ArrowUpRight, CheckCircle2, Gavel, Loader2 } from "lucide-react";
import { MagneticPill, type OrbitItem } from "@/components/MagneticPill";

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
                : "bg-black text-white"
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
  const ref = useRef<HTMLDivElement | null>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    setState({ status: "pending" });
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
          onDoneRef.current();
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
      setTimeout(poll, attempts < 12 ? 1000 : 2500);
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [bidId, paymentId, tick]);

  return (
    <div ref={ref} className="mb-6 rounded-2xl border border-black/[0.08] bg-white px-5 py-4">
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
  const stats = useBidStats();

  const [dialog, setDialog] = useState<{ open: boolean; url?: string; amount?: number }>({
    open: false,
  });

  const entries = board.data ?? [];

  const orbitItems: OrbitItem[] = useMemo(
    () =>
      entries.map((e) => {
        let domain = e.display_url;
        try {
          domain = new URL(
            e.target_url.startsWith("http") ? e.target_url : `https://${e.target_url}`,
          ).hostname.replace(/^www\./, "");
        } catch {
          /* keep display_url */
        }
        return {
          id: e.id,
          logoUrl: e.logo_url || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        };
      }),
    [entries],
  );
  const top = entries[0];

  const clearSearch = useMemo(
    () => () => {
      board.refetch();
      activity.refetch();
      stats.refetch();
      setTimeout(
        () =>
          navigate({
            to: "/startupbid",
            search: { bid: undefined, payment_id: undefined },
            replace: true,
          }),
        6000,
      );
    },
    [board, activity, stats, navigate],
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
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
            <MagneticPill
              items={orbitItems}
              overlay={
                <div
                  className="absolute inset-x-0 pointer-events-none"
                  style={{ top: "50%", transform: "translateY(-50%)", zIndex: 6 }}
                >
                  <div
                    className="hidden sm:grid w-full items-center px-10"
                    style={{ gridTemplateColumns: "1fr auto 1fr" }}
                  >
                    <div className="flex justify-center">
                      <div className="flex items-stretch divide-x divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
                        <div className="px-5 py-2.5">
                          <PillStat
                            label="On the board"
                            value={(stats.data?.entries ?? 0).toLocaleString()}
                          />
                        </div>
                        <div className="px-5 py-2.5">
                          <PillStat label="Total bid" value={formatUsd(stats.data?.total_cents ?? 0)} />
                        </div>
                      </div>
                    </div>
                    <div className="mx-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-4 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
                      <Gavel className="h-4 w-4 text-white" />
                      <span className="text-[18px] font-extrabold leading-none tracking-[-0.03em] text-white">
                        StartupBid
                      </span>
                    </div>
                    <div className="flex justify-center">
                      <div className="flex items-stretch divide-x divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
                        <div className="px-5 py-2.5">
                          <PillStat
                            label="Clicks sent"
                            value={(stats.data?.total_clicks ?? 0).toLocaleString()}
                          />
                        </div>
                        <div className="px-5 py-2.5">
                          <PillStat
                            label="Top bid"
                            value={formatUsd(stats.data?.top_cents ?? 0)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 sm:hidden">
                    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
                      <Gavel className="h-3.5 w-3.5 text-white" />
                      <span className="text-[15px] font-extrabold leading-none tracking-[-0.03em] text-white">
                        StartupBid
                      </span>
                    </div>
                    <div className="flex items-stretch divide-x divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
                      <div className="px-2.5 py-1.5">
                        <PillStat
                          small
                          label="Board"
                          value={(stats.data?.entries ?? 0).toLocaleString()}
                        />
                      </div>
                      <div className="px-2.5 py-1.5">
                        <PillStat small label="Bid" value={formatUsd(stats.data?.total_cents ?? 0)} />
                      </div>
                      <div className="px-2.5 py-1.5">
                        <PillStat
                          small
                          label="Clicks"
                          value={(stats.data?.total_clicks ?? 0).toLocaleString()}
                        />
                      </div>
                      <div className="px-2.5 py-1.5">
                        <PillStat
                          small
                          label="Top bid"
                          value={formatUsd(stats.data?.top_cents ?? 0)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              }
            />
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
                          detail: { cents: priceToClaim(x.total_cents) },
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
                              detail: { cents: priceToClaim(x.total_cents) },
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

        {/* Recent bids + how it works */}
        <section className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6">
          <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-black/40">
              Recent bids
            </h3>
            <div className="mt-3 space-y-3">
              {(activity.data ?? []).length === 0 && (
                <p className="text-[12.5px] text-black/35">No bids yet — be the first.</p>
              )}
              {(activity.data ?? []).slice(0, 6).map((a, i) => (
                <div key={`${a.entry_id}-${i}`} className="flex items-center gap-2.5">
                  <StartupFavicon
                    url={a.display_url}
                    name={a.name}
                    logoUrl={a.logo_url}
                    size={20}
                    className="rounded-md"
                  />
                  <p className="min-w-0 flex-1 truncate text-[12.5px] text-black/55">
                    <span className="font-medium text-black">{a.name}</span> bid{" "}
                    <span className="font-semibold text-black">{formatUsd(a.amount_cents)}</span>
                  </p>
                  <span className="shrink-0 text-[11px] text-black/30">{timeAgo(a.created_at)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-black/40">
              How it works
            </h3>
            <ol className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-black/55">
              <li>1. Enter any site or @handle — yours or one you back.</li>
              <li>2. Pay any amount from $5. It adds to that entry&apos;s total.</li>
              <li>3. Ranking is pure total spend. Outbid anyone, anytime.</li>
              <li>4. Clicks from the board are counted and shown publicly.</li>
            </ol>
            <p className="mt-3 text-[11px] leading-relaxed text-black/30">
              Bids are final and non-refundable. StartupBid is separate from the StartupBar widget
              network — no install required.
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
