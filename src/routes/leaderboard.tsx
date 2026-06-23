import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getLeaderboard, type LeaderboardRow } from "@/lib/leaderboard.functions";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ExternalLink, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — StartupBar" }] }),
  component: LeaderboardPage,
});

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardPage() {
  const fetchLeaderboard = useServerFn(getLeaderboard);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLeaderboard();
        setRows(data.rows);
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

  const body = (
    <div>
      <div className="flex items-center gap-3">
        <Trophy className="h-5 w-5 text-black/30" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Network Leaderboard
          </h1>
          <p className="text-sm text-black/40">All approved startups, ranked by impressions.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-40 text-sm text-black/30">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="mt-16 text-center text-sm text-black/40">No approved startups yet.</div>
      ) : (
        <>
          {rows.length >= 1 && (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {rows.slice(0, 3).map((row, i) => (
                <div
                  key={row.id}
                  className={`rounded-xl border bg-white p-5 ${
                    row.id === myId ? "border-black/25 ring-2 ring-black/8" : "border-black/8"
                  } ${i === 0 ? "md:order-2" : i === 1 ? "md:order-1" : "md:order-3"}`}
                >
                  <div className="text-2xl">{MEDALS[i]}</div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="font-semibold text-black truncate">{row.name}</p>
                    {row.id === myId && (
                      <span className="shrink-0 rounded-full bg-black px-2 py-0.5 text-[10px] font-medium text-white">You</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-black/40 line-clamp-1">{row.description}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-base font-semibold">{row.impressions.toLocaleString()}</div>
                      <div className="text-[10px] text-black/35 uppercase tracking-wide">Impr.</div>
                    </div>
                    <div>
                      <div className="text-base font-semibold">{row.clicks.toLocaleString()}</div>
                      <div className="text-[10px] text-black/35 uppercase tracking-wide">Clicks</div>
                    </div>
                    <div>
                      <div className="text-base font-semibold">{ctr(row)}</div>
                      <div className="text-[10px] text-black/35 uppercase tracking-wide">CTR</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-xl border border-black/8 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-black/6 bg-black/[0.02]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35 sm:px-5">#</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35 sm:px-5">Startup</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35 sm:px-5">Impressions</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35 sm:px-5">Clicks</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35 sm:px-5">CTR</th>
                    <th className="px-4 py-3 sm:px-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {rows.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`transition-colors hover:bg-black/[0.02] ${row.id === myId ? "bg-black/[0.015]" : ""}`}
                    >
                      <td className="px-4 py-3.5 tabular-nums text-black/30 sm:px-5">
                        {i < 3 ? MEDALS[i] : `${i + 1}`}
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-black">{row.name}</span>
                          {row.id === myId && (
                            <span className="rounded-full bg-black px-2 py-0.5 text-[9px] font-medium text-white">You</span>
                          )}
                        </div>
                        <div className="max-w-[180px] truncate text-xs text-black/35 sm:max-w-xs">{row.description}</div>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-medium sm:px-5">{row.impressions.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-medium sm:px-5">{row.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-black/60 sm:px-5">{ctr(row)}</td>
                      <td className="px-4 py-3.5 text-right sm:px-5">
                        <a href={row.website_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-black/30 hover:text-black transition-colors">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Before auth resolves, render a neutral shell to avoid flashing the wrong header.
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
