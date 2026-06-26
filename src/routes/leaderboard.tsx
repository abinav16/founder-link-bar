import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getLeaderboard, getNetworkActivity, type LeaderboardRow } from "@/lib/leaderboard.functions";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — StartupBar" }] }),
  component: LeaderboardPage,
});

const MEDALS = ["🥇", "🥈", "🥉"];

interface NetworkActivity {
  todayImpressions: number;
  todayClicks: number;
  yesterdayImpressions: number;
  yesterdayClicks: number;
}

function LeaderboardPage() {
  const fetchLeaderboard = useServerFn(getLeaderboard);
  const fetchNetworkActivity = useServerFn(getNetworkActivity);
  const [rowsByReceived, setRowsByReceived] = useState<LeaderboardRow[]>([]);
  const [rowsByGiven, setRowsByGiven] = useState<LeaderboardRow[]>([]);
  const [tab, setTab] = useState<"received" | "given">("received");
  const [myId, setMyId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<NetworkActivity | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLeaderboard();
        setRowsByReceived(data.rowsByReceived);
        setRowsByGiven(data.rowsByGiven);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchLeaderboard]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(data.user ?? null);
      setAuthReady(true);
      if (data.user) {
        const { data: mine } = await supabase
          .from("startups")
          .select("id")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (!cancelled) setMyId(mine?.id ?? null);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setMyId(null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function loadActivity() {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);

      const [
        { count: todayImpressions },
        { count: todayClicks },
        { count: yesterdayImpressions },
        { count: yesterdayClicks },
      ] = await Promise.all([
        supabase.from("impressions").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
        supabase.from("clicks").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
        supabase.from("impressions").select("*", { count: "exact", head: true }).gte("created_at", yesterdayStart.toISOString()).lt("created_at", todayStart.toISOString()),
        supabase.from("clicks").select("*", { count: "exact", head: true }).gte("created_at", yesterdayStart.toISOString()).lt("created_at", todayStart.toISOString()),
      ]);

      setActivity({
        todayImpressions: todayImpressions ?? 0,
        todayClicks: todayClicks ?? 0,
        yesterdayImpressions: yesterdayImpressions ?? 0,
        yesterdayClicks: yesterdayClicks ?? 0,
      });
    }
    loadActivity();
  }, []);

  const ctr = (row: LeaderboardRow) =>
    row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(1) + "%" : "—";

  const primaryMetric = (row: LeaderboardRow) =>
    tab === "received" ? row.impressions : row.impressions_given;

  const activeRows = tab === "received" ? rowsByReceived : rowsByGiven;
  const podium = activeRows.slice(0, 3);

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

        <div className="inline-flex rounded-xl border border-black/10 bg-black/[0.03] p-1 gap-1 self-start sm:self-end">
          <button
            onClick={() => setTab("received")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "received" ? "bg-black text-white shadow-sm" : "text-black/50 hover:text-black"
            }`}
          >
            🏆 Most Seen
          </button>
          <button
            onClick={() => setTab("given")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "given" ? "bg-black text-white shadow-sm" : "text-black/50 hover:text-black"
            }`}
          >
            ⚡ Top Contributors
          </button>
        </div>
      </div>

      <p className="text-sm text-black/45 mb-6">
        {tab === "received"
          ? "Startups that appear most across the network — ranked by total impressions received."
          : "Sites generating the most traffic for others — ranked by impressions they gave to the network."}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-40 text-sm text-black/30">Loading…</div>
      ) : activeRows.length === 0 ? (
        <div className="mt-16 text-center text-sm text-black/40">No approved startups yet.</div>
      ) : (
        <>
          {podium.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="lg:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/30 mb-3">Top 3</p>
                <div className="grid grid-cols-3 gap-3 items-end">
                  {podiumDisplay.map((row) => {
                    const originalIndex = podium.findIndex((r) => r.id === row.id);
                    return (
                      <div
                        key={row.id}
                        className={`rounded-2xl border flex flex-col items-center text-center p-3 transition-all ${
                          originalIndex === 0
                            ? "bg-black border-black lg:-mt-3 shadow-xl shadow-black/15 relative z-10"
                            : "bg-white border-black/8"
                        }`}
                      >
                        {originalIndex === 0 && (
                          <p className="text-[8px] font-bold tracking-[0.15em] uppercase text-white/40 mb-1">Leader</p>
                        )}
                        <div className="text-xl mb-1">{MEDALS[originalIndex]}</div>
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${row.website_url}&sz=32`}
                          alt=""
                          className={`w-7 h-7 rounded-lg mb-2 ${originalIndex === 0 ? "ring-2 ring-white/20" : "ring-1 ring-black/8"}`}
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                        <p className={`font-semibold text-xs truncate w-full ${originalIndex === 0 ? "text-white" : "text-black"}`}>
                          {row.name}
                        </p>
                        {row.id === myId && (
                          <span className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                            originalIndex === 0 ? "bg-white/20 text-white" : "bg-black text-white"
                          }`}>You</span>
                        )}
                        <div className="mt-2 w-full">
                          <div className={`text-xl font-bold tabular-nums ${originalIndex === 0 ? "text-white" : "text-black"}`}>
                            {primaryMetric(row).toLocaleString()}
                          </div>
                          <div className={`text-[8px] uppercase tracking-widest font-semibold mt-0.5 ${originalIndex === 0 ? "text-white/40" : "text-black/30"}`}>
                            {tab === "received" ? "impressions" : "given"}
                          </div>
                        </div>
                        <div className={`mt-2 pt-2 border-t w-full flex gap-3 justify-center ${originalIndex === 0 ? "border-white/10" : "border-black/6"}`}>
                          {tab === "received" ? (
                            <>
                              <div>
                                <div className={`text-xs font-semibold ${originalIndex === 0 ? "text-white" : "text-black"}`}>{row.clicks}</div>
                                <div className={`text-[8px] uppercase tracking-wide ${originalIndex === 0 ? "text-white/35" : "text-black/30"}`}>Clicks</div>
                              </div>
                              <div>
                                <div className={`text-xs font-semibold ${originalIndex === 0 ? "text-white" : "text-black"}`}>{ctr(row)}</div>
                                <div className={`text-[8px] uppercase tracking-wide ${originalIndex === 0 ? "text-white/35" : "text-black/30"}`}>CTR</div>
                              </div>
                            </>
                          ) : (
                            <div>
                              <div className={`text-xs font-semibold ${originalIndex === 0 ? "text-white" : "text-black"}`}>{row.impressions}</div>
                              <div className={`text-[8px] uppercase tracking-wide ${originalIndex === 0 ? "text-white/35" : "text-black/30"}`}>Received</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-1 flex flex-col">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/30">Network Activity</p>
                  <p className="text-[10px] text-black/35 text-right whitespace-nowrap">Resets 5:30 AM IST</p>
                </div>
                <div className="rounded-xl border border-black/8 bg-white p-3 flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
                    {/* Yesterday Impressions */}
                    <div className="rounded-lg bg-black/[0.03] p-2.5 flex flex-col justify-between">
                      <div className="flex items-center gap-1">
                        <div className="h-1 w-1 rounded-full bg-black/25" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-black/35">Yesterday</span>
                      </div>
                      <div>
                        <div className="text-xl font-bold tabular-nums text-black leading-none">
                          {activity?.yesterdayImpressions.toLocaleString() ?? "—"}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-black/40 mt-1">Impressions</div>
                      </div>
                    </div>
                    {/* Yesterday Clicks */}
                    <div className="rounded-lg bg-black/[0.03] p-2.5 flex flex-col justify-between">
                      <div className="flex items-center gap-1">
                        <div className="h-1 w-1 rounded-full bg-black/25" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-black/35">Yesterday</span>
                      </div>
                      <div>
                        <div className="text-xl font-bold tabular-nums text-black leading-none">
                          {activity?.yesterdayClicks.toLocaleString() ?? "—"}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-black/40 mt-1">Clicks</div>
                      </div>
                    </div>
                    {/* Today Impressions */}
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
                        <div className="text-[10px] uppercase tracking-wide text-white/50 mt-1">Impressions</div>
                      </div>
                    </div>
                    {/* Today Clicks */}
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
                        <div className="text-[10px] uppercase tracking-wide text-white/50 mt-1">Clicks</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}


          <div className="mt-6 space-y-2">

            {activeRows.map((row, i) => {
              const maxVal = activeRows[0] ? primaryMetric(activeRows[0]) : 1;
              const pct = maxVal > 0 ? (primaryMetric(row) / maxVal) * 100 : 0;
              return (
                <div
                  key={row.id}
                  className={`group flex items-center gap-4 rounded-2xl border bg-white px-5 py-4 transition-all hover:border-black/20 hover:shadow-sm ${
                    row.id === myId ? "border-black/20 ring-1 ring-black/8" : "border-black/8"
                  }`}
                >
                  <div className="w-8 shrink-0 text-center">
                    {i < 3 ? (
                      <span className="text-xl">{MEDALS[i]}</span>
                    ) : (
                      <span className="text-sm font-semibold text-black/25 tabular-nums">{i + 1}</span>
                    )}
                  </div>

                  <img
                    src={`https://www.google.com/s2/favicons?domain=${row.website_url}&sz=32`}
                    alt=""
                    className="h-8 w-8 rounded-lg ring-1 ring-black/8 shrink-0"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-black text-sm">{row.name}</span>
                      {row.id === myId && (
                        <span className="rounded-full bg-black px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wide">You</span>
                      )}
                    </div>
                    <p className="text-xs text-black/35 truncate mt-0.5">{row.description}</p>
                    <div className="mt-2 h-1 w-full rounded-full bg-black/6 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-black transition-all duration-700"
                        style={{ width: `${pct}%`, opacity: i === 0 ? 1 : 0.25 + (pct / 100) * 0.75 }}
                      />
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-base font-bold tabular-nums text-black">{primaryMetric(row).toLocaleString()}</div>
                    <div className="text-[10px] uppercase tracking-wide text-black/30">
                      {tab === "received" ? "impressions" : "given"}
                    </div>
                  </div>

                  {tab === "received" && (
                    <div className="hidden sm:flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-xs font-medium tabular-nums text-black/50">{row.clicks} clicks</span>
                      <span className="text-[11px] text-black/30">{ctr(row)} CTR</span>
                    </div>
                  )}

                  <a
                    href={row.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${row.name}`}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-black/30 hover:text-black transition-colors" />
                  </a>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  if (!authReady) {
    return <div className="min-h-screen bg-[#f7f7f6]" />;
  }

  if (user) {
    return <DashboardLayout>{body}</DashboardLayout>;
  }

  return (
    <div className="min-h-screen bg-[#f7f7f6]">
      <header className="sticky top-0 z-30 border-b border-black/8 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <div className="h-2 w-6 rounded-sm bg-black" />
            <span className="text-sm font-semibold tracking-tight text-black">StartupBar</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/leaderboard" className="flex items-center gap-1.5 px-2 py-2 text-black sm:px-3">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </Link>
            <Link to="/auth" className="px-3 py-2 text-black/50 hover:text-black transition-colors">Sign in</Link>
            <Link to="/apply" className="inline-flex h-9 items-center rounded-md bg-black px-3 text-sm font-medium text-white hover:bg-black/80 transition-colors sm:px-4">
              <span className="hidden sm:inline">Join the network</span>
              <span className="sm:hidden">Join</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{body}</main>
    </div>
  );
}
