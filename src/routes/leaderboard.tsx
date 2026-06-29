import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StartupFavicon } from "@/components/StartupFavicon";
import { getLeaderboard, getNetworkActivity, type LeaderboardRow } from "@/lib/leaderboard.functions";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ExternalLink } from "lucide-react";

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
  head: () => ({ meta: [{ title: "Leaderboard — StartupBar" }] }),
  loader: async () => {
    const [leaderboard, activity] = await Promise.all([getLeaderboard(), getNetworkActivity()]);
    return { leaderboard, activity };
  },

  component: LeaderboardPage,
});

const MEDALS = ["🥇", "🥈", "🥉"];

function MiniSparkline({ data, color = "#000" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-7">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full transition-all duration-500"
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

function LeaderboardPage() {
  const { leaderboard, activity } = Route.useLoaderData();
  const rowsByReceived = leaderboard.rowsByReceived;
  const rowsByGiven = leaderboard.rowsByGiven;
  const [tab, setTab] = useState<"received" | "given">("received");
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
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
      if (!session?.user) setMyId(null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
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

      {activeRows.length === 0 ? (
        <div className="mt-16 text-center text-sm text-black/40">No approved startups yet.</div>
      ) : (
        <>
          {podium.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="lg:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/30 mb-3">Top 3</p>
                <div className="grid grid-cols-3 gap-3 items-end">
                  {podiumDisplay.map((row: LeaderboardRow) => {
                    const originalIndex = podium.findIndex((r: LeaderboardRow) => r.id === row.id);
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
                        <StartupFavicon
                          url={row.website_url}
                          name={row.name}
                          logoUrl={row.logo_url}
                          size={28}
                          className={`rounded-lg mb-2 bg-white ${originalIndex === 0 ? "ring-2 ring-white/20" : "ring-1 ring-black/8"}`}
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
                        <a
                          href={`/api/public/widget/click?id=${row.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mt-2 inline-flex items-center gap-1 text-[10px] font-semibold transition-opacity hover:opacity-70 ${
                            originalIndex === 0 ? "text-white/60" : "text-black/40"
                          }`}
                        >
                          Visit site <ExternalLink className="h-2.5 w-2.5" />
                        </a>
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
            {activeRows.map((row: LeaderboardRow, i: number) => (
              <div
                key={row.id}
                className={`group flex items-center gap-4 rounded-2xl border bg-white px-5 py-4 transition-all hover:border-black/20 hover:shadow-sm ${
                  row.id === myId ? "border-black/20 ring-1 ring-black/8" : "border-black/8"
                }`}
              >
                <div className="w-7 shrink-0 text-center">
                  {i < 3 ? (
                    <span className="text-lg">{MEDALS[i]}</span>
                  ) : (
                    <span className="text-sm font-semibold text-black/25 tabular-nums">{i + 1}</span>
                  )}
                </div>

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
                    {row.id === myId && (
                      <span className="rounded-full bg-black px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wide shrink-0">You</span>
                    )}
                  </div>
                  <p className="text-xs text-black/40 truncate mt-0.5">{row.description}</p>
                </div>

                <div className="shrink-0 hidden sm:flex flex-col items-center gap-1">
                  <MiniSparkline
                    data={tab === "received" ? row.dailyImpressions : row.dailyGiven}
                  />
                  <span className="text-[8px] uppercase tracking-wide text-black/20">7 days</span>
                </div>

                {tab === "received" ? (
                  <div className="shrink-0 flex gap-3 sm:gap-5 text-right">
                    <div>
                      <div className="text-sm sm:text-base font-bold tabular-nums text-black">{row.impressions.toLocaleString()}</div>
                      <div className="text-[9px] uppercase tracking-wide text-black/30 mt-0.5">Impr.</div>
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-bold tabular-nums text-black">{row.clicks.toLocaleString()}</div>
                      <div className="text-[9px] uppercase tracking-wide text-black/30 mt-0.5">Clicks</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-base font-bold tabular-nums text-black">{ctr(row)}</div>
                      <div className="text-[9px] uppercase tracking-wide text-black/30 mt-0.5">CTR</div>
                    </div>
                  </div>
                ) : (
                  <div className="shrink-0 flex gap-3 sm:gap-5 text-right">
                    <div>
                      <div className="text-sm sm:text-base font-bold tabular-nums text-black">{row.impressions_given.toLocaleString()}</div>
                      <div className="text-[9px] uppercase tracking-wide text-black/30 mt-0.5">Given</div>
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-bold tabular-nums text-black">{row.impressions.toLocaleString()}</div>
                      <div className="text-[9px] uppercase tracking-wide text-black/30 mt-0.5">Recv.</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-base font-bold tabular-nums text-black">
                        {row.impressions > 0 ? `${(row.impressions_given / row.impressions).toFixed(1)}x` : "—"}
                      </div>
                      <div className="text-[9px] uppercase tracking-wide text-black/30 mt-0.5">Ratio</div>
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

        </>
      )}
    </div>
  );

  return <DashboardLayout>{body}</DashboardLayout>;
}