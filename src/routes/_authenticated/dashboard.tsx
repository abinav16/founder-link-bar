import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, Code2, ArrowRight, BarChart2, MousePointerClick, Layers, Percent, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StartupFavicon } from "@/components/StartupFavicon";

function DashboardPending() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-black/[0.04] rounded-full animate-pulse" />
          <div className="h-7 w-48 bg-black/[0.07] rounded-lg animate-pulse" />
          <div className="h-3 w-64 bg-black/[0.04] rounded-full animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-black/8 bg-white p-5 space-y-3 animate-pulse">
              <div className="h-2.5 w-20 bg-black/[0.05] rounded-full" />
              <div className="h-9 w-16 bg-black/[0.07] rounded-lg" />
              <div className="h-2.5 w-32 bg-black/[0.04] rounded-full" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-black/8 bg-white p-6 space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-3 w-36 bg-black/[0.05] rounded-full" />
            <div className="h-3 w-16 bg-black/[0.04] rounded-full" />
          </div>
          <div className="flex items-end gap-2 h-20">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full rounded-t-sm bg-black/[0.06]" style={{ height: `${20 + Math.random() * 44}px` }} />
                <div className="h-2 w-4 bg-black/[0.04] rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-black/8 bg-white p-6 space-y-3 animate-pulse">
              <div className="h-3 w-28 bg-black/[0.05] rounded-full" />
              <div className="h-3 w-64 bg-black/[0.04] rounded-full" />
              <div className="h-10 bg-black/[0.04] rounded-lg" />
              <div className="h-8 w-28 bg-black/[0.05] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

async function loadDashboardData(startupId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const [impsR, clksR, dailyR, allImpsR, current] = await Promise.all([
    supabase.from("impressions").select("*", { count: "exact", head: true }).eq("shown_startup_id", startupId),
    supabase.from("clicks").select("*", { count: "exact", head: true }).eq("shown_startup_id", startupId),
    supabase.from("impressions").select("created_at").eq("shown_startup_id", startupId).gte("created_at", since.toISOString()),
    supabase.from("impressions").select("shown_startup_id"),
    fetch(`/api/public/widget/pick?host=${startupId}&preview=true`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const chartData = [0, 0, 0, 0, 0, 0, 0];
  (dailyR.data ?? []).forEach((row: { created_at: string }) => {
    const d = new Date(row.created_at); d.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff <= 6) chartData[6 - diff]++;
  });

  const countMap = new Map<string, number>();
  (allImpsR.data ?? []).forEach((r: { shown_startup_id: string }) => {
    countMap.set(r.shown_startup_id, (countMap.get(r.shown_startup_id) ?? 0) + 1);
  });
  const myCount = countMap.get(startupId) ?? 0;
  const rank = [...countMap.values()].filter((c) => c > myCount).length + 1;

  return {
    stats: { impressions: impsR.count ?? 0, clicks: clksR.count ?? 0 },
    chartData,
    rank,
    current: current as Startup | null,
  };
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — StartupBar" }] }),
  loader: async () => {
    const { data: u } = await supabase.auth.getUser();
    const userName = u.user?.user_metadata?.full_name?.split(" ")[0] ?? "";

    const { data: rows } = await supabase
      .from("startups").select("*").eq("user_id", u.user!.id).order("created_at", { ascending: true });
    const allStartups = (rows as Startup[]) ?? [];
    const startup = allStartups[0] ?? null;

    if (!startup) {
      return { userName, allStartups, startup: null, stats: { impressions: 0, clicks: 0 }, chartData: [0, 0, 0, 0, 0, 0, 0], rank: null as number | null, current: null as Startup | null };
    }

    const extra = await loadDashboardData(startup.id);
    return { userName, allStartups, startup, ...extra };
  },

  component: DashboardPage,
});

interface Startup {
  id: string;
  name: string;
  website_url: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string | null;
}

function StatusPill({ status }: { status: Startup["status"] }) {
  const map = {
    pending:  { label: "Pending review", dot: "bg-amber-400",   cls: "bg-amber-50  border-amber-200  text-amber-700" },
    approved: { label: "Live",           dot: "bg-emerald-400", cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
    rejected: { label: "Not approved",   dot: "bg-red-400",     cls: "bg-red-50    border-red-200    text-red-700" },
  } as const;
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-white p-5 ${accent ? "border-black/20" : "border-black/8"}`}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        {value}
      </div>
      <div className="mt-1 text-xs text-black/35">{sub}</div>
    </div>
  );
}

function rollingLabels(): string[] {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return dayNames[d.getDay()];
  });
}

function Sparkline({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1);
  const [tooltip, setTooltip] = useState<{ idx: number } | null>(null);
  return (
    <div className="flex h-20 items-end gap-2">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex flex-1 flex-col items-center gap-1.5 relative"
          onMouseEnter={() => setTooltip({ idx: i })}
          onMouseLeave={() => setTooltip(null)}
        >
          {tooltip?.idx === i && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-2 py-1 text-[10px] font-medium text-white z-10">
              {v} impression{v !== 1 ? "s" : ""} · {labels[i]}
            </div>
          )}
          <div
            className="w-full rounded-t-sm bg-black transition-all duration-500"
            style={{ height: `${Math.max((v / max) * 64, v > 0 ? 4 : 2)}px`, opacity: v > 0 ? 1 : 0.12 }}
          />
          <span className="text-[9px] text-black/25">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function DashboardPage() {
  const loaderData = Route.useLoaderData();
  const [allStartups, setAllStartups] = useState<Startup[]>(loaderData.allStartups);
  const [startup, setStartup] = useState<Startup | null>(loaderData.startup);
  const [stats, setStats] = useState(loaderData.stats);
  const [current, setCurrent] = useState<Startup | null>(loaderData.current);
  const [copied, setCopied] = useState(false);
  const [userName] = useState(loaderData.userName);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<{ name: string; url: string; desc: string } | null>(null);

  useEffect(() => {
    if (startup) return;
    try {
      const raw = sessionStorage.getItem("startupbar:apply-draft");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.name || parsed?.url) {
        setDraft({ name: parsed.name ?? "", url: parsed.url ?? "", desc: parsed.desc ?? "" });
      }
    } catch { /* ignore */ }
  }, [startup]);

  useEffect(() => {
    if (!switcherOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [switcherOpen]);
  const [installStatus, setInstallStatus] = useState<"checking" | "live" | "disconnected" | "unknown">("unknown");
  const [chartData, setChartData] = useState<number[]>(loaderData.chartData);
  const [rank, setRank] = useState<number | null>(loaderData.rank);

  useEffect(() => {
    if (startup) checkInstall(startup.website_url);

    let userId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: u }) => {
      if (!u.user) return;
      userId = u.user.id;
      channel = supabase
        .channel(`dashboard-startup:${userId}:${crypto.randomUUID()}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "startups",
          filter: `user_id=eq.${userId}`,
        }, (payload) => {
          if (payload.eventType === "DELETE") {
            setStartup(null);
            setStats({ impressions: 0, clicks: 0 });
            setCurrent(null);
          } else if (payload.eventType === "UPDATE") {
            setStartup(payload.new as Startup);
          }
        })
        .subscribe();
    });

    const onDeleted = () => {
      setAllStartups([]);
      setStartup(null);
      setStats({ impressions: 0, clicks: 0 });
      setCurrent(null);
    };
    window.addEventListener("startup-deleted", onDeleted);

    return () => {
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener("startup-deleted", onDeleted);
    };
  }, []);

  async function checkInstall(siteUrl: string) {
    setInstallStatus("checking");
    try {
      const res = await fetch(`/api/public/verify-install?url=${encodeURIComponent(siteUrl)}`);
      const json = await res.json();
      setInstallStatus(json.installed ? "live" : "disconnected");
    } catch {
      setInstallStatus("unknown");
    }
  }

  async function switchStartup(s: Startup) {
    setSwitcherOpen(false);
    setStartup(s);
    setStats({ impressions: 0, clicks: 0 });
    setCurrent(null);
    setChartData([0, 0, 0, 0, 0, 0, 0]);
    checkInstall(s.website_url);
    const extra = await loadDashboardData(s.id);
    setStats(extra.stats);
    setChartData(extra.chartData);
    setRank(extra.rank);
    setCurrent(extra.current);
  }

  const snippet = startup
    ? `<script async src="https://startupbar.co/widget/loader.js" data-startup-id="${startup.id}"></script>`
    : "";

  const ctr = stats.impressions > 0
    ? ((stats.clicks / stats.impressions) * 100).toFixed(1)
    : "0.0";

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 1500);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <DashboardLayout>
      <div>
        {!startup ? (
          <div className="mx-auto max-w-2xl py-10 sm:py-16">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-black/35">
              {draft ? "Draft saved" : "Welcome"}
            </span>
            <h1 className="mt-3 text-3xl font-medium leading-tight tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
              {draft ? "Pick up where you left off." : "You're one step away from free traffic."}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-black/45">
              {draft
                ? "We saved your application. Finish submitting it to start exchanging traffic with founders across the network."
                : "Submit your startup to get featured on other founders' sites — and show one of theirs on yours. Reviewed within 24 hours."}
            </p>

            {draft && (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-black/10 bg-white px-5 py-4">
                {draft.url && <StartupFavicon url={draft.url} name={draft.name || "Startup"} size={24} className="rounded-sm" />}
                <div className="min-w-0">
                  <p className="font-medium text-black">{draft.name || "Untitled"}</p>
                  {draft.url && <p className="truncate text-xs text-black/40">{draft.url}</p>}
                </div>
              </div>
            )}

            <Link
              to="/apply"
              className="group mt-6 inline-flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-black/80 transition-all"
            >
              {draft ? "Resume application" : "Apply your startup"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <div className="mt-8 flex items-center gap-3 text-[12px] text-black/40">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Sign up</span>
              <span className="text-black/15">—</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-black"><span className="h-1.5 w-1.5 rounded-full bg-black" /> Submit startup</span>
              <span className="text-black/15">—</span>
              <span className="text-black/35">Get approved & live</span>
            </div>

            <div className="mt-10 space-y-3 border-t border-black/8 pt-8">
              {[
                "Your bar shows on sites across the network within 24h of approval.",
                "In return, you show one other startup on your site — fully automatic.",
                "Free forever. Cancel anytime by removing the script tag.",
              ].map((t) => (
                <div key={t} className="flex items-start gap-3">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <p className="text-[13px] leading-relaxed text-black/50">{t}</p>
                </div>
              ))}
            </div>

            <Link to="/leaderboard" className="mt-8 inline-flex items-center gap-1.5 text-xs text-black/35 hover:text-black transition-colors">
              See who's already in the network →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-black/40">
                {greeting}{userName ? `, ${userName}` : ""} 👋
              </p>
              <div className="mt-1 flex items-center gap-3 flex-wrap">
                {allStartups.length > 1 ? (
                  <div className="relative" ref={switcherRef}>
                    <button
                      onClick={() => setSwitcherOpen(!switcherOpen)}
                      className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-1.5 hover:border-black/25 transition-all"
                    >
                      <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                        {startup.name}
                      </h1>
                      <ChevronDown className="h-4 w-4 text-black/30 mt-1" />
                    </button>
                    {switcherOpen && (
                      <div className="absolute left-0 top-full z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-black/8 bg-white shadow-lg">
                        {allStartups.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => switchStartup(s)}
                            className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-black/[0.03] transition-colors ${s.id === startup.id ? "font-medium text-black" : "text-black/60"}`}
                          >
                            <StartupFavicon url={s.website_url} name={s.name} size={16} className="rounded-sm" />
                            <span className="truncate">{s.name}</span>
                            {s.id === startup.id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-black" />}
                          </button>
                        ))}
                        <div className="border-t border-black/6 px-4 py-2">
                          <Link to="/apply" className="flex items-center gap-1.5 text-xs text-black/40 hover:text-black transition-colors">
                            + Add another startup
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                    {startup.name}
                  </h1>
                )}
                <StatusPill status={startup.status} />
              </div>
              <p className="mt-0.5 text-sm text-black/40">{startup.description}</p>
            </div>

            {startup.status === "pending" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-800">
                <strong>Under review</strong> — we approve applications within 24 hours. The embed script unlocks once you're approved.
              </div>
            )}

            {startup.status === "rejected" && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-red-900">Not approved</p>
                    {startup.rejection_reason ? (
                      <p className="mt-1 text-red-800/90">
                        <span className="font-medium">Reason:</span> {startup.rejection_reason}
                      </p>
                    ) : (
                      <p className="mt-1 text-red-800/80">
                        Fix the issue and resubmit — no need to pay again.
                      </p>
                    )}
                  </div>
                  <Link
                    to="/apply"
                    search={{ resubmit: startup.id } as never}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-red-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-red-800 transition-colors"
                  >
                    Fix & resubmit →
                  </Link>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={BarChart2} label="Impressions" value={stats.impressions.toLocaleString()} sub="Times shown on the network" />
              <StatCard icon={MousePointerClick} label="Clicks" value={stats.clicks.toLocaleString()} sub="Visits driven to your site" />
              <StatCard icon={Percent} label="CTR" value={`${ctr}%`} sub="Click-through rate" />
              <StatCard icon={BarChart2} label="Rank" value={rank ? `#${rank}` : "—"} sub="By impressions" />
            </div>

            <div className="rounded-xl border border-black/8 bg-white p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-black">Impressions — last 7 days</p>
                <span className="text-xs text-black/30">This week</span>
              </div>
              <div className="mt-6">
                <Sparkline data={chartData} labels={rollingLabels()} />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 min-w-0">
              <div className="rounded-xl border border-black/8 bg-white p-6 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-black/30" />
                    <p className="text-sm font-semibold text-black">Embed script</p>
                  </div>
                  {installStatus === "checking" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 text-[11px] font-medium text-black/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-black/20 animate-pulse" />
                      Checking…
                    </span>
                  )}
                  {installStatus === "live" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      Live
                    </span>
                  )}
                  {installStatus === "disconnected" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Not detected
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-black/40">
                  Paste once in the <code className="rounded bg-black/5 px-1 py-0.5 font-mono">&lt;head&gt;</code> of your site.
                </p>
                <div className="mt-3 overflow-x-auto rounded-lg bg-black/[0.04] p-3">
                  <code className="whitespace-nowrap font-mono text-[11px] text-black/60">{snippet}</code>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={copy}
                    disabled={startup.status !== "approved"}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black transition hover:bg-black/[0.04] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {startup.status === "approved" ? (copied ? "Copied!" : "Copy script") : "Available after approval"}
                  </button>
                  {installStatus === "disconnected" && (
                    <button
                      onClick={() => checkInstall(startup.website_url)}
                      className="text-xs text-black/35 hover:text-black transition-colors"
                    >
                      Re-check
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-black/8 bg-white p-6 min-w-0 overflow-hidden">
                <p className="text-sm font-semibold text-black">Currently showing on your site</p>
                {current ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-black/8 bg-black/[0.02] px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{current.name}</p>
                      <p className="truncate text-xs text-black/40">{current.description}</p>
                    </div>
                    <a href={current.website_url} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 text-xs text-black/30 hover:text-black transition-colors flex items-center gap-1">
                      Visit <span className="text-[10px]">↗</span>
                    </a>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-black/35">
                    {startup.status === "approved"
                      ? "No partner assigned yet — check back as the network grows."
                      : "Will appear once your startup is approved."}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
