import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getLeaderboard, type LeaderboardRow } from "@/lib/leaderboard.functions";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — StartupBar" }] }),
  component: LeaderboardPage,
});

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardPage() {
  const fetchLeaderboard = useServerFn(getLeaderboard);
  const [rowsByReceived, setRowsByReceived] = useState<LeaderboardRow[]>([]);
  const [rowsByGiven, setRowsByGiven] = useState<LeaderboardRow[]>([]);
  const [tab, setTab] = useState<"received" | "given">("received");
  const [myId, setMyId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const ctr = (row: LeaderboardRow) =>
    row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(1) + "%" : "—";

  const primaryMetric = (row: LeaderboardRow) =>
    tab === "received" ? row.impressions : row.impressions_given;

  const activeRows = tab === "received" ? rowsByReceived : rowsByGiven;
  const podium = activeRows.slice(0, 3);
  // Display order: 2nd, 1st, 3rd
  const podiumDisplay = [podium[1], podium[0], podium[2]].filter(Boolean) as LeaderboardRow[];
  const podiumOriginalIndex = (row: LeaderboardRow) => podium.findIndex((r) => r.id === row.id);

  const body = (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
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

      <p className="text-sm text-black/45 -mt-4 mb-8">
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
          {podiumDisplay.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3 md:items-end">
              {podiumDisplay.map((row) => {
                const i = podiumOriginalIndex(row);
                return (
                  <div
                    key={row.id}
                    className={`rounded-2xl border p-4 flex flex-col items-center text-center transition-all ${
                      i === 0
                        ? "border-black bg-black text-white md:py-6 md:-mt-2 md:shadow-2xl md:shadow-black/20 md:z-10 relative"
                        : "border-black/8 bg-white"
                    }`}
                  >
                    {i === 0 && (
                      <div className="mb-2 text-[9px] font-bold tracking-[0.15em] uppercase text-white/40">
                        Network Leader
                      </div>
                    )}
                    <div className="text-2xl mb-2">{MEDALS[i]}</div>
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${row.website_url}&sz=64`}
                      alt=""
                      className={`w-8 h-8 rounded-lg mb-2 ${i === 0 ? "ring-2 ring-white/20" : "ring-1 ring-black/8"}`}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                    <p className={`font-bold text-sm leading-tight truncate max-w-full ${i === 0 ? "text-white" : "text-black"}`}>
                      {row.name}
                    </p>
                    {row.id === myId && (
                      <span className={`mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                        i === 0 ? "bg-white/20 text-white" : "bg-black text-white"
                      }`}>You</span>
                    )}
                    <p className={`mt-0.5 text-[11px] line-clamp-1 max-w-full ${i === 0 ? "text-white/50" : "text-black/35"}`}>
                      {row.description}
                    </p>
                    <div className="mt-4 w-full">
                      <div className={`text-2xl font-bold tabular-nums ${i === 0 ? "text-white" : "text-black"}`}>
                        {primaryMetric(row).toLocaleString()}
                      </div>
                      <div className={`text-[9px] uppercase tracking-widest mt-1 font-semibold ${i === 0 ? "text-white/40" : "text-black/30"}`}>
                        {tab === "received" ? "impressions" : "given to network"}
                      </div>
                    </div>
                    {tab === "received" ? (
                      <div className={`mt-3 flex gap-4 text-center border-t pt-3 w-full justify-center ${i === 0 ? "border-white/10" : "border-black/6"}`}>
                        <div>
                          <div className={`text-xs font-semibold ${i === 0 ? "text-white" : "text-black"}`}>{row.clicks}</div>
                          <div className={`text-[9px] uppercase tracking-wide ${i === 0 ? "text-white/35" : "text-black/30"}`}>Clicks</div>
                        </div>
                        <div>
                          <div className={`text-xs font-semibold ${i === 0 ? "text-white" : "text-black"}`}>{ctr(row)}</div>
                          <div className={`text-[9px] uppercase tracking-wide ${i === 0 ? "text-white/35" : "text-black/30"}`}>CTR</div>
                        </div>
                      </div>
                    ) : (
                      <div className={`mt-4 flex gap-4 text-center border-t pt-4 w-full justify-center ${i === 0 ? "border-white/10" : "border-black/6"}`}>
                        <div>
                          <div className={`text-sm font-semibold ${i === 0 ? "text-white" : "text-black"}`}>{row.impressions}</div>
                          <div className={`text-[9px] uppercase tracking-wide ${i === 0 ? "text-white/35" : "text-black/30"}`}>Received</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
