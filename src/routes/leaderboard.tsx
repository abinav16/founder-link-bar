import { createFileRoute, Link } from "@tanstack/react-router";
import { useWebMCP } from "use-webmcp-tool";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { BannerSlot } from "@/components/BannerAd";
import { BANNER_EVERY_N_ROWS } from "@/lib/banner-ads";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SponsoredRail } from "@/components/SponsoredRail";
import { StartupFavicon } from "@/components/StartupFavicon";
import { getLeaderboard, getNetworkActivity, type LeaderboardRow } from "@/lib/leaderboard.functions";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ExternalLink, Info, Zap } from "lucide-react";
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
          className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-black/55 cursor-help outline-none ${className}`}
        >
          {label}
          <Info className="h-2.5 w-2.5 text-black/55" />
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
  const [myIds, setMyIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return (window.sessionStorage.getItem("sb_my_startup_ids") ?? "").split(",").filter(Boolean);
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // getSession() reads localStorage first — no server round-trip.
      const { data: sess } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!sess.session?.user) {
        setMyIds([]);
        window.sessionStorage.removeItem("sb_my_startup_ids");
        return;
      }
      const { data: mine } = await supabase
        .from("startups")
        .select("id")
        .eq("user_id", sess.session.user.id)
        .eq("status", "approved")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const ids = (mine ?? []).map((m) => m.id);
      setMyIds(ids);
      if (ids.length) window.sessionStorage.setItem("sb_my_startup_ids", ids.join(","));
      else window.sessionStorage.removeItem("sb_my_startup_ids");
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) {
        setMyIds([]);
        window.sessionStorage.removeItem("sb_my_startup_ids");
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

  useWebMCP({
    name: "read_leaderboard",
    description: "Read the current leaderboard ranking and its selected time period and metric.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () => runWebMCPTool("read_leaderboard", () => `${tab}; ${rangeSuffix}\n${activeRows.map((row, i) => `${i + 1}. ${row.id}: ${row.name}; impressions: ${primaryMetric(row)}; clicks: ${clicksMetric(row)}`).join("\n") || "No startups shown."}`),
  });


  const activityPanel = (
              <div className="flex flex-col">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55">Network Activity</p>
                  <p className="text-[10px] text-black/55 text-right whitespace-nowrap">Resets 5:30 AM IST</p>
                </div>
                <div className="rounded-xl border border-black/8 bg-white p-3 flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
                    <div className="rounded-lg bg-black/[0.03] p-2.5 flex flex-col justify-between">
                      <div className="flex items-center gap-1">
                        <div className="h-1 w-1 rounded-full bg-black/25" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-black/55">Yesterday</span>
                      </div>
                      <div>
                        <div className="text-xl font-bold tabular-nums text-black leading-none">
                          {activity?.yesterdayImpressions.toLocaleString() ?? "—"}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-black/65 mt-1">Impressions</div>
                      </div>
                    </div>
                    <div className="rounded-lg bg-black/[0.03] p-2.5 flex flex-col justify-between">
                      <div className="flex items-center gap-1">
                        <div className="h-1 w-1 rounded-full bg-black/25" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-black/55">Yesterday</span>
                      </div>
                      <div>
                        <div className="text-xl font-bold tabular-nums text-black leading-none">
                          {activity?.yesterdayClicks.toLocaleString() ?? "—"}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-black/65 mt-1">Clicks</div>
                      </div>
                    </div>
                    <div className="rounded-lg bg-black p-2.5 flex flex-col justify-between">
                      <div className="flex items-center gap-1">
                        <span className="relative flex h-1 w-1">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                          <span className="relative inline-flex h-1 w-1 rounded-full bg-white" />
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Today</span>
                      </div>
                      <div>
                        <div className="text-xl font-bold tabular-nums text-white leading-none">
                          {activity?.todayImpressions.toLocaleString() ?? "—"}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-white/70 mt-1">Impressions</div>
                      </div>
                    </div>
                    <div className="rounded-lg bg-black p-2.5 flex flex-col justify-between">
                      <div className="flex items-center gap-1">
                        <span className="relative flex h-1 w-1">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                          <span className="relative inline-flex h-1 w-1 rounded-full bg-white" />
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Today</span>
                      </div>
                      <div>
                        <div className="text-xl font-bold tabular-nums text-white leading-none">
                          {activity?.todayClicks.toLocaleString() ?? "—"}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-white/70 mt-1">Clicks</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
  );

  const top10 = windowEmpty ? [] : activeRows.slice(0, 8);
  const top10Total = top10.reduce((n, r) => n + primaryMetric(r), 0) || 1;
  const allTotal = activeRows.reduce((n, r) => n + primaryMetric(r), 0) || 1;
  const movers = [...rowsByReceived]
    .map((r) => {
      const d = r.dailyImpressions;
      const recent = (d[4] ?? 0) + (d[5] ?? 0) + (d[6] ?? 0);
      const prev = (d[1] ?? 0) + (d[2] ?? 0) + (d[3] ?? 0);
      return { r, recent, growth: prev > 0 ? (recent - prev) / prev : recent > 0 ? 1 : 0 };
    })
    .filter((x) => x.recent >= 20 && x.growth > 0)
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 5);
  const bestCtr = [...rowsByReceived]
    .filter((r) => r.impressions >= 1000)
    .map((r) => ({ r, v: (r.clicks / r.impressions) * 100 }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 5);
  const maxCtr = bestCtr[0]?.v || 1;

  const sideRow = (r: LeaderboardRow, right: ReactNode, i: number) => {
    const inner = (
      <>
        <StartupFavicon url={r.website_url} name={r.name} logoUrl={r.logo_url} size={26} className="rounded-lg ring-1 ring-black/8 bg-white shrink-0" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{r.name}</span>
        {right}
      </>
    );
    return r.slug ? (
      <Link key={r.id} to="/startup/$slug" params={{ slug: r.slug }} className="lb-side-row" style={{ animationDelay: `${i * 70}ms` }}>{inner}</Link>
    ) : (
      <div key={r.id} className="lb-side-row" style={{ animationDelay: `${i * 70}ms` }}>{inner}</div>
    );
  };

  const leftRail = (
    <aside className="lb-rail space-y-4">
      {activityPanel}
      {top10.length > 0 && (
        <div className="lb-card">
          <p className="lb-eyebrow">Share of {tab === "received" ? "views" : "traffic given"}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{Math.round((top10Total / allTotal) * 100)}%</p>
          <p className="text-xs text-black/55">held by the top {top10.length} ({rangeSuffix})</p>
          <div className="lb-stack mt-4">
            {top10.map((r, i) => (
              <span key={r.id} title={r.name} style={{ flexGrow: primaryMetric(r), opacity: 1 - i * 0.1, animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {top10.slice(0, 5).map((r, i) => (
              <li key={r.id} className="flex items-center gap-2 text-[12px]">
                <i className="lb-dot" style={{ opacity: 1 - i * 0.1 }} />
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="tabular-nums text-black/60">{((primaryMetric(r) / allTotal) * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );

  const myPositions = activeRows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => myIds.includes(r.id))
    .map(({ r, i }) => ({ row: r, rank: i + 1, above: i > 0 ? activeRows[i - 1] : null }));

  const rightRail = (
    <aside className="lb-rail space-y-4">
      {movers.length > 0 && (
        <div className="lb-card">
          <div className="flex items-center justify-between"><p className="lb-eyebrow">Rising fast</p><span className="lb-live"><i />Last 3 days</span></div>
          <div className="mt-3 space-y-0.5">
            {movers.map((m, i) => sideRow(m.r, <span className="lb-up">▲ {Math.round(m.growth * 100)}%</span>, i))}
          </div>
        </div>
      )}
      {bestCtr.length > 0 && (
        <div className="lb-card">
          <p className="lb-eyebrow">Best click rate</p>
          <div className="mt-3 space-y-0.5">
            {bestCtr.map((b, i) => sideRow(b.r, (
              <span className="flex items-center gap-2">
                <span className="lb-mini"><span style={{ width: `${(b.v / maxCtr) * 100}%` }} /></span>
                <span className="w-10 text-right text-[12px] font-semibold tabular-nums">{b.v.toFixed(1)}%</span>
              </span>
            ), i))}
          </div>
        </div>
      )}
      {myPositions.length > 0 ? (
        <div className="lb-card lb-dark">
          <p className="lb-eyebrow" style={{ color: "inherit", opacity: .6 }}>{myPositions.length > 1 ? "Your startups" : "Your position"}</p>
          <div className="mt-3 space-y-4">
            {myPositions.map(({ row, rank, above }) => (
              <div key={row.id}>
                <div className="flex items-center gap-3">
                  <StartupFavicon url={row.website_url} name={row.name} logoUrl={row.logo_url} size={28} className="rounded-lg bg-white shrink-0" />
                  <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{row.name}</p>
                  <p className={`${myPositions.length > 1 ? "text-2xl" : "text-4xl"} font-bold tabular-nums leading-none`}>#{rank}</p>
                </div>
                <p className="mt-1.5 text-[12px] opacity-75">{primaryMetric(row).toLocaleString()} {tab === "received" ? "views" : "given"} ({rangeSuffix}) · of {activeRows.length}</p>
                {above ? (
                  <>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "color-mix(in oklab, var(--background) 20%, transparent)" }}>
                      <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (primaryMetric(row) / Math.max(1, primaryMetric(above))) * 100)}%`, background: "var(--background)" }} />
                    </div>
                    <p className="mt-1.5 text-[11px] opacity-75">{(primaryMetric(above) - primaryMetric(row) + 1).toLocaleString()} more to pass {above.name}</p>
                  </>
                ) : <p className="mt-1.5 text-[11px] opacity-75">Leading the board 🏆</p>}
              </div>
            ))}
          </div>
          <Link to="/dashboard" className="lb-cta mt-4">View my stats</Link>
        </div>
      ) : (
        <div className="lb-card lb-dark">
          <Trophy className="h-5 w-5" />
          <p className="mt-3 text-lg font-semibold leading-snug">Climb the board</p>
          <p className="mt-1 text-[13px] opacity-75">Every visitor your bar sends out earns your startup views back across the network.</p>
          <Link to="/apply" className="lb-cta mt-4">Join free</Link>
        </div>
      )}
    </aside>
  );

  const body = (
    <div className="lb-shell">
    {leftRail}
    <div className="min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-black/55" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/55">Network</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
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
                : "bg-white text-black/65 border-black/10 hover:text-black hover:border-black/25"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-black/65 mb-6">
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
        <div className="mt-16 text-center text-sm text-black/65">No approved startups yet.</div>
      ) : windowEmpty ? (
        <div className="mt-16 text-center text-sm text-black/65">
          {range === "today"
            ? "No activity yet today — check back after the 5:30 AM IST reset."
            : "No activity in the last 7 days yet."}
        </div>
      ) : (
        <>
          {podium.length > 0 && (
            <div className="lb-podium">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55 mb-3">Top 3</p>
                <div className="grid grid-cols-3 gap-3 sm:gap-5 items-end">
                  {podiumDisplay.map((row: LeaderboardRow) => {
                    const originalIndex = podium.findIndex((r: LeaderboardRow) => r.id === row.id);
                    const dark = row.sponsored || (originalIndex === 0 && !row.supporter);
                    return (
                      <div
                        key={row.id}
                        className={`rounded-2xl border flex flex-col items-center text-center p-3 transition-all relative overflow-hidden ${
                          row.sponsored
                            ? "sb-sponsored border-[oklch(0.72_0.13_75)]"
                            : row.supporter
                              ? "sb-featured-row"
                              : dark
                                ? "bg-black border-black lg:-mt-3 shadow-xl shadow-black/15 z-10"
                                : "bg-white border-black/8"
                        }`}
                      >
                        {dark && !row.sponsored && (
                          <p className="text-[8px] font-bold tracking-[0.15em] uppercase text-white/70 mb-1">Leader</p>
                        )}
                        {row.sponsored ? (
                          <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-[0.12em] text-[oklch(0.82_0.13_75)]">Featured</span>
                        ) : row.supporter ? (
                          <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-[0.12em] text-[oklch(0.5_0.11_70)]">Supporter</span>
                        ) : null}
                        {isNew(row.created_at) && (
                          <NewBadge className="absolute top-2 right-2" />
                        )}
                        <div className="text-xl mb-1">{MEDALS[originalIndex]}</div>
                        {(() => {
                          const inner = (
                            <>
                              <StartupFavicon
                                url={row.website_url}
                                name={row.name}
                                logoUrl={row.logo_url}
                                size={28}
                                className={`rounded-lg mb-2 bg-white ${dark ? "ring-2 ring-white/20" : "ring-1 ring-black/8"}`}
                              />
                              <p className={`font-semibold text-xs truncate w-full ${dark ? "text-white" : "text-black"}`}>
                                {row.name}
                              </p>
                            </>
                          );
                          return row.slug ? (
                            <Link
                              to="/startup/$slug"
                              params={{ slug: row.slug }}
                              className="flex flex-col items-center w-full hover:opacity-80 transition-opacity"
                            >
                              {inner}
                            </Link>
                          ) : (
                            inner
                          );
                        })()}

                        {myIds.includes(row.id) && (
                          <span className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                            dark ? "bg-white/20 text-white" : "bg-black text-white"
                          }`}>You</span>
                        )}
                        <div className="mt-2 w-full">
                          <div className={`text-xl font-bold tabular-nums ${dark ? "text-white" : "text-black"}`}>
                            {primaryMetric(row).toLocaleString()}
                          </div>
                          <div className={`text-[8px] uppercase tracking-widest font-semibold mt-0.5 ${dark ? "text-white/70" : "text-black/55"}`}>
                            {(tab === "received" ? "impressions" : "given") +
                              (range === "today" ? " today" : range === "week" ? " · 7d" : "")}
                          </div>
                        </div>
                        <div className={`mt-2 pt-2 border-t w-full flex gap-3 justify-center ${dark ? "border-white/10" : "border-black/6"}`}>
                          {tab === "received" ? (
                            <>
                              <div>
                                <div className={`text-xs font-semibold ${dark ? "text-white" : "text-black"}`}>{clicksMetric(row)}</div>
                                <div className={`text-[8px] uppercase tracking-wide ${dark ? "text-white/70" : "text-black/55"}`}>Clicks</div>
                              </div>
                              <div>
                                <div className={`text-xs font-semibold ${dark ? "text-white" : "text-black"}`}>{ctr(row)}</div>
                                <div className={`text-[8px] uppercase tracking-wide ${dark ? "text-white/70" : "text-black/55"}`}>CTR</div>
                              </div>
                            </>
                          ) : (
                            <div>
                              <div className={`text-xs font-semibold ${dark ? "text-white" : "text-black"}`}>{receivedMetric(row)}</div>
                              <div className={`text-[8px] uppercase tracking-wide ${dark ? "text-white/70" : "text-black/55"}`}>Received</div>
                            </div>
                          )}
                        </div>
                        <a
                          href={`/api/public/widget/click?id=${row.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mt-2 inline-flex items-center gap-1 text-[10px] font-semibold transition-opacity hover:opacity-70 ${
                            dark ? "text-white/60" : "text-black/65"
                          }`}
                        >
                          Visit site <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}


          <div className="mt-6">
            {/* Column headers — desktop only; each metric explains itself on hover */}
            <div className="hidden sm:flex items-center gap-4 px-5 pb-2">
              <div className="w-7 shrink-0 text-center text-[9px] font-semibold uppercase tracking-wide text-black/55">#</div>
              <div className="w-9 shrink-0" />
              <div className="flex-1 min-w-0 text-[9px] font-semibold uppercase tracking-wide text-black/55">Startup</div>
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
              <Fragment key={row.id}>
              {i > 0 && i % BANNER_EVERY_N_ROWS === 0 ? <BannerSlot slot={i / BANNER_EVERY_N_ROWS - 1} /> : null}
              <div
                className={`group flex items-center gap-4 rounded-2xl border px-5 py-4 transition-all overflow-hidden ${
                  row.sponsored
                    ? "sb-featured-row relative hover:shadow-[0_8px_24px_-12px_oklch(0.65_0.15_68_/_0.3)]"
                    : row.supporter
                      ? "sb-featured-row relative hover:shadow-[0_8px_24px_-12px_oklch(0.65_0.15_68_/_0.3)]"
                      : myIds.includes(row.id)
                      ? "bg-white border-black/20 ring-1 ring-black/8 hover:border-black/20 hover:shadow-sm"
                      : "bg-white border-black/8 hover:border-black/20 hover:shadow-sm"
                }`}
              >
                <div className="w-7 shrink-0 text-center">
                  {i < 3 ? (
                    <span className="text-lg">{MEDALS[i]}</span>
                  ) : (
                    <span className="text-sm font-semibold text-black/55 tabular-nums">{i + 1}</span>
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
                        {myIds.includes(row.id) && (
                          <span className="rounded-full bg-black px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wide shrink-0">You</span>
                        )}
                      </div>
                      <p className="text-xs text-black/65 truncate mt-0.5">{row.description}</p>
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
                        {myIds.includes(row.id) && (
                          <span className="rounded-full bg-black px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wide shrink-0">You</span>
                        )}
                      </div>
                      <p className="text-xs text-black/65 truncate mt-0.5">{row.description}</p>
                    </div>
                  </>
                )}


                <div className="w-[76px] shrink-0 hidden sm:flex flex-col items-center gap-1">
                  <MiniSparkline data={sparkData(row)} />
                  <span className="text-[8px] uppercase tracking-wide text-black/55 whitespace-nowrap">{sparkLabel}</span>
                </div>

                {tab === "received" ? (
                  <div className="shrink-0 flex gap-3 sm:gap-5 text-right">
                    <div className="sm:w-16">
                      <div className="text-sm sm:text-base font-bold tabular-nums text-black">{receivedMetric(row).toLocaleString()}</div>
                      <div className="text-[9px] uppercase tracking-wide text-black/55 mt-0.5 sm:hidden">Impr.</div>
                      {range !== "all" && (
                        <div className="text-[9px] tabular-nums text-black/55 mt-0.5">{row.impressions.toLocaleString()} all-time</div>
                      )}
                    </div>
                    <div className="sm:w-16">
                      <div className="text-sm sm:text-base font-bold tabular-nums text-black">{clicksMetric(row).toLocaleString()}</div>
                      <div className="text-[9px] uppercase tracking-wide text-black/55 mt-0.5 sm:hidden">Clicks</div>
                      {range !== "all" && (
                        <div className="text-[9px] tabular-nums text-black/55 mt-0.5">{row.clicks.toLocaleString()} all-time</div>
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
                      <div className="text-[9px] uppercase tracking-wide text-black/55 mt-0.5 sm:hidden">Given</div>
                      {range !== "all" && (
                        <div className="text-[9px] tabular-nums text-black/55 mt-0.5">{row.impressions_given.toLocaleString()} all-time</div>
                      )}
                    </div>
                    <div className="sm:w-16">
                      <div className="text-sm sm:text-base font-bold tabular-nums text-black">{receivedMetric(row).toLocaleString()}</div>
                      <div className="text-[9px] uppercase tracking-wide text-black/55 mt-0.5 sm:hidden">Recv.</div>
                      {range !== "all" && (
                        <div className="text-[9px] tabular-nums text-black/55 mt-0.5">{row.impressions.toLocaleString()} all-time</div>
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
                  <ExternalLink className="h-3.5 w-3.5 text-black/55 hover:text-black transition-colors" />
                </a>
              </div>
              </Fragment>
            ))}
            </div>
          </div>


        </>
      )}
    </div>
    {rightRail}
    </div>
  );

  return <DashboardLayout fullWidth rail={<SponsoredRail />}><TooltipProvider>{body}</TooltipProvider></DashboardLayout>;
}