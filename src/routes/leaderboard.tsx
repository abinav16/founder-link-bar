import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SponsoredRail } from "@/components/SponsoredRail";
import { StartupFavicon } from "@/components/StartupFavicon";
import { getLeaderboard, getNetworkActivity, type LeaderboardRow } from "@/lib/leaderboard.functions";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ExternalLink, Info, Zap, ArrowUpRight, Eye, MousePointer2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeaturedStartupIds } from "@/lib/featured";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


function LeaderboardPending() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-20 bg-black/[0.05] rounded-full animate-pulse" />
            <div className="h-7 w-40 bg-black/[0.07] rounded-lg animate-pulse" />
            <div className="h-3 w-64 bg-black/[0.04] rounded-full animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-black/[0.06] p-6 animate-pulse space-y-4">
              <div className="h-3 w-8 bg-black/[0.05] rounded-full" />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-black/[0.06] shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 bg-black/[0.05] rounded-full w-2/3" />
                  <div className="h-2.5 bg-black/[0.03] rounded-full w-full" />
                </div>
              </div>
              <div className="h-7 bg-black/[0.03] rounded-lg" />
              <div className="h-px bg-black/[0.04]" />
              <div className="flex gap-4">
                <div className="h-3 w-16 bg-black/[0.04] rounded-full" />
                <div className="h-3 w-12 bg-black/[0.04] rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-white border border-black/[0.06] overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-black/[0.04] last:border-0 animate-pulse">
              <div className="w-5 h-3 bg-black/[0.04] rounded-full shrink-0" />
              <div className="w-9 h-9 rounded-lg bg-black/[0.05] shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-black/[0.05] rounded-full w-1/4" />
                <div className="h-2.5 bg-black/[0.03] rounded-full w-1/2" />
              </div>
              <div className="h-7 w-16 bg-black/[0.03] rounded-lg" />
              <div className="space-y-1 text-right">
                <div className="h-3.5 w-12 bg-black/[0.05] rounded-full ml-auto" />
                <div className="h-2.5 w-8 bg-black/[0.03] rounded-full ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
      { title: "Leaderboard — StartupBar" },
      { name: "description", content: "See which founder startups are driving the most impressions and clicks across the StartupBar network." },
      { property: "og:title", content: "Leaderboard — StartupBar" },
      { property: "og:description", content: "Top-performing founder startups on the StartupBar traffic exchange." },
      { property: "og:url", content: "https://startupbar.co/leaderboard" },
    ],
    links: [{ rel: "canonical", href: "https://startupbar.co/leaderboard" }],
  }),
  loader: async () => {
    const [leaderboard, activity] = await Promise.all([getLeaderboard(), getNetworkActivity()]);
    return { leaderboard, activity };
  },

  component: LeaderboardPage,
});

const MEDALS = ["🥇", "🥈", "🥉"];

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function NewBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`text-[9px] font-semibold tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-full bg-black text-white leading-none ${className}`}>
      New
    </span>
  );
}

function MiniSparkline({ data, color = "#000" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const dense = data.length > 12;
  return (
    <div className={`flex items-end h-7 ${dense ? "gap-[1px]" : "gap-[2px]"}`}>
      {data.map((v, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-500 ${dense ? "w-[2px]" : "w-[3px]"}`}
          style={{
            height: `${Math.max((v / max) * 100, v > 0 ? 15 : 8)}%`,
            background: color,
            opacity: v > 0 ? (0.3 + (v / max) * 0.7) : 0.12,
          }}
        />
      ))}
    </div>
  );
}


type Range = "today" | "week" | "all";

const RANGE_OPTIONS: { key: Range; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "all", label: "All-time" },
];

function ColHeader({ label, hint, className = "" }: { label: string; hint: string; className?: string }) {
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-black/35 cursor-help outline-none ${className}`}
        >
          {label}
          <Info className="h-2.5 w-2.5 text-black/25" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[230px] text-[11px] leading-relaxed">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}


function LeaderboardPage() {
  const { leaderboard, activity } = Route.useLoaderData();
  const featuredIds = useFeaturedStartupIds();
  const markFeatured = (rows: LeaderboardRow[]) =>
    rows.map((r) => (featuredIds.has(r.id) && !r.sponsored ? { ...r, sponsored: true } : r));
  const rowsByReceived = useMemo(
    () => markFeatured(leaderboard.rowsByReceived),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leaderboard.rowsByReceived, featuredIds],
  );
  const rowsByGiven = useMemo(
    () => markFeatured(leaderboard.rowsByGiven),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leaderboard.rowsByGiven, featuredIds],
  );
  const [tab, setTab] = useState<"received" | "given">("received");
  const [range, setRange] = useState<Range>("all");
  // Hydrate myId from sessionStorage so repeat visits highlight "You"
  // without the post-render fetch flicker.
  const [myId, setMyId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem("sb_my_startup_id");
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // getSession() reads localStorage first — no server round-trip.
      const { data: sess } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!sess.session?.user) {
        setMyId(null);
        window.sessionStorage.removeItem("sb_my_startup_id");
        return;
      }
      const { data: mine } = await supabase
        .from("startups")
        .select("id")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (cancelled) return;
      const id = mine?.id ?? null;
      setMyId(id);
      if (id) window.sessionStorage.setItem("sb_my_startup_id", id);
      else window.sessionStorage.removeItem("sb_my_startup_id");
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) {
        setMyId(null);
        window.sessionStorage.removeItem("sb_my_startup_id");
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);


  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  // Daily buckets hold 7 days (index 6 = today); hourly buckets hold the 24
  // hours of the current day — so every window is a pure client-side re-read.
  const receivedMetric = (row: LeaderboardRow) => {
    if (range === "today") return row.dailyImpressions[6] ?? 0;
    if (range === "week") return sum(row.dailyImpressions);
    return row.impressions;
  };
  const givenMetric = (row: LeaderboardRow) => {
    if (range === "today") return row.dailyGiven[6] ?? 0;
    if (range === "week") return sum(row.dailyGiven);
    return row.impressions_given;
  };
  const clicksMetric = (row: LeaderboardRow) => {
    if (range === "today") return row.dailyClicks[6] ?? 0;
    if (range === "week") return sum(row.dailyClicks);
    return row.clicks;
  };
  const primaryMetric = (row: LeaderboardRow) =>
    tab === "received" ? receivedMetric(row) : givenMetric(row);

  const ctr = (row: LeaderboardRow) => {
    const imp = receivedMetric(row);
    const clk = clicksMetric(row);
    return imp > 0 ? ((clk / imp) * 100).toFixed(1) + "%" : "—";
  };
  const ratio = (row: LeaderboardRow) => {
    const recv = receivedMetric(row);
    return recv > 0 ? `${(givenMetric(row) / recv).toFixed(1)}x` : "—";
  };

  const sparkData = (row: LeaderboardRow) => {
    if (range === "today") return tab === "received" ? row.hourlyImpressions : row.hourlyGiven;
    if (range === "all") return tab === "received" ? row.monthlyImpressions : row.monthlyGiven;
    return tab === "received" ? row.dailyImpressions : row.dailyGiven;
  };
  const sparkLabel = range === "today" ? "Today · hourly" : range === "week" ? "Last 7 days" : "Last 12 months";

  const rangeSuffix = range === "today" ? "today" : range === "week" ? "7d" : "all-time";

  const baseRows = tab === "received" ? rowsByReceived : rowsByGiven;
  const activeRows =
    range === "all"
      ? baseRows
      : [...baseRows].sort((a, b) => primaryMetric(b) - primaryMetric(a));
  const windowEmpty =
    range !== "all" && activeRows.every((r: LeaderboardRow) => primaryMetric(r) === 0);
  const podium = windowEmpty ? [] : activeRows.slice(0, 3);

  const podiumDisplay = [podium[1], podium[0], podium[2]].filter(Boolean) as LeaderboardRow[];


  const body = (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-black/30" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/30">Network</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Leaderboard
          </h1>
        </div>

        <div
          className="leaderboard-switch self-start sm:self-end"
          role="group"
          aria-label="Leaderboard ranking"
          data-selection={tab}
        >
          <Button
            type="button"
            variant="ghost"
            aria-pressed={tab === "received"}
            onClick={() => setTab("received")}
            className="leaderboard-switch-option"
          >
            <Trophy aria-hidden="true" />
            <span>Most Seen</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-pressed={tab === "given"}
            onClick={() => setTab("given")}
            className="leaderboard-switch-option"
          >
            <Zap aria-hidden="true" />
            <span>Top Contributors</span>
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setRange(opt.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border ${
              range === opt.key
                ? "bg-black text-white border-black"
                : "bg-white text-black/50 border-black/10 hover:text-black hover:border-black/25"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-black/45 mb-6">
        {tab === "received"
          ? range === "today"
            ? "Startups seen most across the network today — ranked by impressions received since the 5:30 AM IST reset."
            : range === "week"
              ? "Startups seen most over the last 7 days — ranked by impressions received."
              : "Startups that appear most across the network — ranked by total impressions received."
          : range === "today"
            ? "Sites sending the most traffic to others today — ranked by impressions given."
            : range === "week"
              ? "Sites sending the most traffic over the last 7 days — ranked by impressions given."
              : "Sites generating the most traffic for others — ranked by impressions they gave to the network."}
      </p>

      {activeRows.length === 0 ? (
        <div className="mt-16 text-center text-sm text-black/40">No approved startups yet.</div>
      ) : windowEmpty ? (
        <div className="mt-16 text-center text-sm text-black/40">
          {range === "today"
            ? "No activity yet today — check back after the 5:30 AM IST reset."
            : "No activity in the last 7 days yet."}
        </div>
      ) : (
        <>
          {podium.length > 0 && (
            <div className="leaderboard-overview">
              <section className="leaderboard-podium" aria-label="Top three startups">
                <div className="leaderboard-section-heading">
                  <h2><Trophy aria-hidden="true" /> Top 3</h2>
                  <span>{RANGE_OPTIONS.find((option) => option.key === range)?.label}</span>
                </div>
                <div className="leaderboard-podium-grid">
                  {podiumDisplay.map((row: LeaderboardRow) => {
                    const originalIndex = podium.findIndex((r: LeaderboardRow) => r.id === row.id);
                    const identity = (
                      <>
                        <StartupFavicon url={row.website_url} name={row.name} logoUrl={row.logo_url} size={40} className="leaderboard-podium-logo" />
                        <h3>{row.name}</h3>
                      </>
                    );
                    return (
                      <article key={row.id} className={`leaderboard-podium-card ${row.sponsored ? "sb-sponsored" : row.supporter ? "sb-featured-row" : ""}`} data-rank={originalIndex + 1}>
                        <div className="leaderboard-podium-topline">
                          <span className="leaderboard-rank" aria-label={`Rank ${originalIndex + 1}`}>{String(originalIndex + 1).padStart(2, "0")}</span>
                          <span className="leaderboard-podium-status">
                            {originalIndex === 0 && <Trophy aria-hidden="true" />}
                            {row.sponsored ? "Featured" : row.supporter ? "Supporter" : originalIndex === 0 ? "Leading" : ""}
                          </span>
                        </div>
                        {row.slug ? (
                          <Link to="/startup/$slug" params={{ slug: row.slug }} className="leaderboard-podium-identity">{identity}</Link>
                        ) : <div className="leaderboard-podium-identity">{identity}</div>}
                        <div className="leaderboard-podium-tags">
                          {row.id === myId && <span>You</span>}
                          {isNew(row.created_at) && <span>New</span>}
                        </div>
                        <div className="leaderboard-podium-total">
                          <strong>{primaryMetric(row).toLocaleString()}</strong>
                          <span>{(tab === "received" ? "Impressions" : "Impressions given") + (range === "today" ? " today" : range === "week" ? " · 7d" : "")}</span>
                        </div>
                        <div className="leaderboard-podium-details">
                          {tab === "received" ? <>
                            <div><strong>{clicksMetric(row).toLocaleString()}</strong><span>Clicks</span></div>
                            <div><strong>{ctr(row)}</strong><span>CTR</span></div>
                          </> : <div><strong>{receivedMetric(row).toLocaleString()}</strong><span>Received</span></div>}
                        </div>
                        <Button variant="ghost" asChild className="leaderboard-podium-visit">
                          <a href={`/api/public/widget/click?id=${row.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${row.name}`}>
                            Visit site <ArrowUpRight aria-hidden="true" />
                          </a>
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </section>
              <section className="leaderboard-activity" aria-label="Network activity">
                <div className="leaderboard-section-heading">
                  <h2><Zap aria-hidden="true" /> Network activity</h2>
                  <p className="leaderboard-activity-reset"><Clock3 aria-hidden="true" /> Resets at 5:30 AM IST</p>
                </div>
                <div className="leaderboard-activity-comparison">
                <div className="leaderboard-activity-period" data-period="today">
                  <div className="leaderboard-activity-period-heading"><h3>Today</h3><span className="leaderboard-live"><i /> Live</span></div>
                  <div className="leaderboard-activity-values">
                    <div><strong>{activity?.todayImpressions.toLocaleString() ?? "—"}</strong><span><Eye aria-hidden="true" /> Impressions</span></div>
                    <div><strong>{activity?.todayClicks.toLocaleString() ?? "—"}</strong><span><MousePointer2 aria-hidden="true" /> Clicks</span></div>
                  </div>
                </div>
                <div className="leaderboard-activity-period" data-period="yesterday">
                  <div className="leaderboard-activity-period-heading"><h3>Yesterday</h3></div>
                  <div className="leaderboard-activity-values">
                    <div><strong>{activity?.yesterdayImpressions.toLocaleString() ?? "—"}</strong><span><Eye aria-hidden="true" /> Impressions</span></div>
                    <div><strong>{activity?.yesterdayClicks.toLocaleString() ?? "—"}</strong><span><MousePointer2 aria-hidden="true" /> Clicks</span></div>
                  </div>
                </div>
                </div>
              </section>
            </div>
          )}


          <div className="mt-6">
            {/* Column headers — desktop only; each metric explains itself on hover */}
            <div className="hidden sm:flex items-center gap-4 px-5 pb-2">
              <div className="w-7 shrink-0 text-center text-[9px] font-semibold uppercase tracking-wide text-black/25">#</div>
              <div className="w-9 shrink-0" />
              <div className="flex-1 min-w-0 text-[9px] font-semibold uppercase tracking-wide text-black/35">Startup</div>
              <div className="w-[76px] shrink-0 flex justify-center">
                <ColHeader
                  label="Trend"
                  hint={
                    range === "today"
                      ? "Activity hour by hour since today's 5:30 AM IST reset."
                      : range === "all"
                        ? "Monthly activity over the last 12 months — most recent month on the right."
                        : "Daily activity over the last 7 days — most recent day on the right."
                  }
                />
              </div>
              {tab === "received" ? (
                <div className="shrink-0 flex gap-5">
                  <div className="w-16 flex justify-end">
                    <ColHeader
                      label="Impr."
                      hint={`Impressions received (${rangeSuffix}) — times this startup's card was shown inside other founders' widgets.`}
                    />
                  </div>
                  <div className="w-16 flex justify-end">
                    <ColHeader
                      label="Clicks"
                      hint={`Clicks received (${rangeSuffix}) — times a visitor clicked through to this startup from a widget, the network page, or the leaderboard.`}
                    />
                  </div>
                  <div className="w-14 flex justify-end">
                    <ColHeader label="CTR" hint={`Clicks ÷ impressions for the selected window (${rangeSuffix}).`} />
                  </div>
                </div>
              ) : (
                <div className="shrink-0 flex gap-5">
                  <div className="w-16 flex justify-end">
                    <ColHeader
                      label="Given"
                      hint={`Impressions given (${rangeSuffix}) — traffic this startup delivered to others by running the widget on its own site.`}
                    />
                  </div>
                  <div className="w-16 flex justify-end">
                    <ColHeader
                      label="Recv."
                      hint={`Impressions this startup received back from the network (${rangeSuffix}).`}
                    />
                  </div>
                  <div className="w-16 flex justify-end">
                    <ColHeader label="Given / Recv." hint="How many impressions this site gave to others for every one it got back. It's normal for this to be above 1.0x — each impression reaches a different startup, so a heavy contributor can't receive all the traffic it sends. That's how new and small members get traffic too." />
                  </div>
                </div>
              )}
              <div className="w-3.5 shrink-0" />
            </div>

            <div className="space-y-2">
            {activeRows.map((row: LeaderboardRow, i: number) => (
              <div
                key={row.id}
                className={`group flex items-center gap-4 rounded-2xl border px-5 py-4 transition-all overflow-hidden ${
                  row.sponsored
                    ? "sb-featured-row relative hover:shadow-[0_8px_24px_-12px_oklch(0.65_0.15_68_/_0.3)]"
                    : row.supporter
                      ? "sb-featured-row relative hover:shadow-[0_8px_24px_-12px_oklch(0.65_0.15_68_/_0.3)]"
                      : row.id === myId
                      ? "bg-white border-black/20 ring-1 ring-black/8 hover:border-black/20 hover:shadow-sm"
                      : "bg-white border-black/8 hover:border-black/20 hover:shadow-sm"
                }`}
              >
                <div className="w-7 shrink-0 text-center">
                  {i < 3 ? (
                    <span className="text-lg">{MEDALS[i]}</span>
                  ) : (
                    <span className="text-sm font-semibold text-black/25 tabular-nums">{i + 1}</span>
                  )}
                </div>

                {row.slug ? (
                  <Link
                    to="/startup/$slug"
                    params={{ slug: row.slug }}
                    className="flex flex-1 min-w-0 items-center gap-3 group/link"
                  >
                    <StartupFavicon
                      url={row.website_url}
                      name={row.name}
                      logoUrl={row.logo_url}
                      size={36}
                      className="rounded-xl ring-1 ring-black/8 shrink-0 bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-black truncate group-hover/link:underline underline-offset-2">{row.name}</span>
                        {row.sponsored ? (
                          <span className="rounded-full bg-[oklch(0.65_0.15_68)] px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wide shrink-0">Featured</span>
                        ) : row.supporter ? (
                          <span className="rounded-full border border-[oklch(0.72_0.13_75_/_0.6)] bg-[oklch(0.9_0.1_85_/_0.5)] px-1.5 py-0.5 text-[8px] font-bold text-[oklch(0.45_0.1_70)] uppercase tracking-wide shrink-0">Supporter</span>
                        ) : null}
                        {isNew(row.created_at) && <NewBadge />}
                        {row.id === myId && (
                          <span className="rounded-full bg-black px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wide shrink-0">You</span>
                        )}
                      </div>
                      <p className="text-xs text-black/40 truncate mt-0.5">{row.description}</p>
                    </div>
                  </Link>
                ) : (
                  <>
                    <StartupFavicon
                      url={row.website_url}
                      name={row.name}
                      logoUrl={row.logo_url}
                      size={36}
                      className="rounded-xl ring-1 ring-black/8 shrink-0 bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-black truncate">{row.name}</span>
                        {row.sponsored ? (
                          <span className="rounded-full bg-[oklch(0.65_0.15_68)] px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wide shrink-0">Featured</span>
                        ) : row.supporter ? (
                          <span className="rounded-full border border-[oklch(0.72_0.13_75_/_0.6)] bg-[oklch(0.9_0.1_85_/_0.5)] px-1.5 py-0.5 text-[8px] font-bold text-[oklch(0.45_0.1_70)] uppercase tracking-wide shrink-0">Supporter</span>
                        ) : null}
                        {isNew(row.created_at) && <NewBadge />}
                        {row.id === myId && (
                          <span className="rounded-full bg-black px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wide shrink-0">You</span>
                        )}
                      </div>
                      <p className="text-xs text-black/40 truncate mt-0.5">{row.description}</p>
                    </div>
                  </>
                )}


                <div className="w-[76px] shrink-0 hidden sm:flex flex-col items-center gap-1">
                  <MiniSparkline data={sparkData(row)} />
                  <span className="text-[8px] uppercase tracking-wide text-black/20 whitespace-nowrap">{sparkLabel}</span>
                </div>

                {tab === "received" ? (
                  <div className="shrink-0 flex gap-3 sm:gap-5 text-right">
                    <div className="sm:w-16">
                      <div className="text-sm sm:text-base font-bold tabular-nums text-black">{receivedMetric(row).toLocaleString()}</div>
                      <div className="text-[9px] uppercase tracking-wide text-black/30 mt-0.5 sm:hidden">Impr.</div>
                      {range !== "all" && (
                        <div className="text-[9px] tabular-nums text-black/25 mt-0.5">{row.impressions.toLocaleString()} all-time</div>
                      )}
                    </div>
                    <div className="sm:w-16">
                      <div className="text-sm sm:text-base font-bold tabular-nums text-black">{clicksMetric(row).toLocaleString()}</div>
                      <div className="text-[9px] uppercase tracking-wide text-black/30 mt-0.5 sm:hidden">Clicks</div>
                      {range !== "all" && (
                        <div className="text-[9px] tabular-nums text-black/25 mt-0.5">{row.clicks.toLocaleString()} all-time</div>
                      )}
                    </div>
                    <div className="hidden sm:block sm:w-14">
                      <div className="text-base font-bold tabular-nums text-black">{ctr(row)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="shrink-0 flex gap-3 sm:gap-5 text-right">
                    <div className="sm:w-16">
                      <div className="text-sm sm:text-base font-bold tabular-nums text-black">{givenMetric(row).toLocaleString()}</div>
                      <div className="text-[9px] uppercase tracking-wide text-black/30 mt-0.5 sm:hidden">Given</div>
                      {range !== "all" && (
                        <div className="text-[9px] tabular-nums text-black/25 mt-0.5">{row.impressions_given.toLocaleString()} all-time</div>
                      )}
                    </div>
                    <div className="sm:w-16">
                      <div className="text-sm sm:text-base font-bold tabular-nums text-black">{receivedMetric(row).toLocaleString()}</div>
                      <div className="text-[9px] uppercase tracking-wide text-black/30 mt-0.5 sm:hidden">Recv.</div>
                      {range !== "all" && (
                        <div className="text-[9px] tabular-nums text-black/25 mt-0.5">{row.impressions.toLocaleString()} all-time</div>
                      )}
                    </div>
                    <div className="hidden sm:block sm:w-16">
                      <div className="text-base font-bold tabular-nums text-black">{ratio(row)}</div>
                    </div>
                  </div>
                )}

                <a
                  href={`/api/public/widget/click?id=${row.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit ${row.name}`}
                  className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-black/30 hover:text-black transition-colors" />
                </a>
              </div>
            ))}
            </div>
          </div>


        </>
      )}
    </div>
  );

  return <DashboardLayout rail={<SponsoredRail />}><TooltipProvider>{body}</TooltipProvider></DashboardLayout>;
}