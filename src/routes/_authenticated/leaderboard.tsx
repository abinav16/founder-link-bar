import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getLeaderboard, type LeaderboardRow } from "@/lib/leaderboard.functions";
import { Trophy, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — StartupBar" }] }),
  component: LeaderboardPage,
});

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardPage() {
  const fetchLeaderboard = useServerFn(getLeaderboard);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLeaderboard();
        setRows(data.rows);
        setMyId(data.myId);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchLeaderboard]);

  const ctr = (row: LeaderboardRow) =>
    row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(1) + "%" : "—";

  return (
    <DashboardLayout>
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
    </DashboardLayout>
  );
}
