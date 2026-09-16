import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, Code2, ArrowRight, BarChart2, MousePointerClick, Layers, Percent, ChevronDown, Globe2, Smartphone, Monitor, Tablet, User, Eye } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PromoteButton } from "@/components/FeaturedBookingDialog";
import { StartupFavicon } from "@/components/StartupFavicon";
import { LiveVisitorMap } from "@/components/LiveVisitorMap";

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

interface TrafficBreakdown {
  countries: { country: string; count: number }[];
  devices: { device: string; count: number }[];
  topReferrers: { id: string; name: string; website_url: string; impressions: number; clicks: number }[];
}

async function loadTrafficBreakdown(startupId: string): Promise<TrafficBreakdown> {
  const [impsR, clksR] = await Promise.all([
    supabase
      .from("impressions")
      .select("country, device, host_startup_id, referrer")
      .eq("shown_startup_id", startupId)
      .neq("referrer", "dev-simulate")
      .limit(2000),
    supabase
      .from("clicks")
      .select("host_startup_id")
      .eq("shown_startup_id", startupId)
      .not("host_startup_id", "is", null)
      .limit(2000),
  ]);

  const impRows = impsR.data ?? [];
  const clkRows = clksR.data ?? [];

  const countryCounts = new Map<string, number>();
  const deviceCounts = new Map<string, number>();
  const referrerImpressions = new Map<string, number>();
  const referrerClicks = new Map<string, number>();

  for (const row of impRows) {
    const country = row.country ?? "Unknown";
    countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);

    const device = row.device ?? "unknown";
    deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + 1);

    if (row.host_startup_id) {
      referrerImpressions.set(row.host_startup_id, (referrerImpressions.get(row.host_startup_id) ?? 0) + 1);
    }
  }

  for (const row of clkRows) {
    if (row.host_startup_id) {
      referrerClicks.set(row.host_startup_id, (referrerClicks.get(row.host_startup_id) ?? 0) + 1);
    }
  }

  const topReferrerIds = [...referrerImpressions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let topReferrers: TrafficBreakdown["topReferrers"] = [];
  if (topReferrerIds.length > 0) {
    const { data: startups } = await supabase
      .from("startups")
      .select("id, name, website_url")
      .in("id", topReferrerIds);
    topReferrers = topReferrerIds
      .map((id) => {
        const s = (startups ?? []).find((x) => x.id === id);
        return s
          ? { id, name: s.name, website_url: s.website_url, impressions: referrerImpressions.get(id) ?? 0, clicks: referrerClicks.get(id) ?? 0 }
          : null;
      })
      .filter((x): x is TrafficBreakdown["topReferrers"][number] => x !== null);
  }

  return {
    countries: [...countryCounts.entries()].map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 5),
    devices: [...deviceCounts.entries()].map(([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count),
    topReferrers,
  };
}

async function loadDashboardData(startupId: string) {
  const [summaryR, shownR, hostsR, breakdown] = await Promise.all([
    supabase.rpc("public_startup_dashboard_summary", { _startup_id: startupId }),
    supabase.rpc("dashboard_host_shown_7d" as never, { _host: startupId } as never),
    supabase.rpc("dashboard_startup_hosts_7d" as never, { _startup: startupId } as never),
    loadTrafficBreakdown(startupId),
  ]);

  const row = (summaryR.data ?? [])[0] ?? {
    impressions: 0,
    clicks: 0,
    rank: 1,
    daily_impressions: [0, 0, 0, 0, 0, 0, 0],
  };

  return {
    stats: { impressions: row.impressions, clicks: row.clicks },
    chartData: row.daily_impressions,
    rank: row.rank,
    recentShown: ((shownR.data as unknown as RecentShown[] | null) ?? []),
    recentHosts: ((hostsR.data as unknown as RecentHost[] | null) ?? []),
    breakdown,
  };
}

/** A member that was actually displayed by this startup's own bar. */
interface RecentShown {
  startup_id: string;
  name: string;
  description: string;
  website_url: string;
  logo_url: string | null;
  appearance_count: number;
  last_shown_at: string;
}

/** A site where this startup's own listing was displayed. */
interface RecentHost {
  host_id: string;
  name: string;
  slug: string | null;
  website_url: string;
  logo_url: string | null;
  appearance_count: number;
  last_shown_at: string;
}

/** "2 min ago" style label for the recent-activity lists. */
function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}


type RangeKey = "24h" | "7d" | "30d" | "all";

// Visits to the startup's public page on startupbar.co (/startup/<slug>).
// Counted server-side so the raw impressions table stays closed to readers.
async function loadProfileViews(startupId: string, since: Date | null) {
  const { data } = await supabase.rpc("public_startup_profile_views" as never, {
    _startup_id: startupId,
    _since: since ? since.toISOString() : null,
  } as never);
  return typeof data === "number" ? data : Number(data ?? 0) || 0;
}

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
];

const RANGE_SUB: Record<RangeKey, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};

const RANGE_CHART_TITLE: Record<RangeKey, string> = {
  "24h": "last 24 hours",
  "7d": "last 7 days",
  "30d": "last 30 days",
  all: "last 12 months",
};

// Windowed totals + chart buckets now come from trigger-maintained rollups,
// so the dashboard no longer scans the raw impressions/clicks tables.
async function loadRangeData(startupId: string, range: RangeKey) {
  const { data } = await supabase.rpc("public_startup_range_data", {
    _startup_id: startupId,
    _range: range,
  });
  const row = (data ?? [])[0] ?? {
    impressions: 0,
    clicks: 0,
    chart_data: [],
    labels: [],
  };
  return {
    stats: { impressions: row.impressions, clicks: row.clicks },
    chartData: row.chart_data,
    labels: row.labels,
  };
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — StartupBar" }] }),
  loader: async () => {
    const { data: u } = await supabase.auth.getUser();
    const userName = u.user?.user_metadata?.full_name?.split(" ")[0] ?? "";

    // Owners read their own full rows (widget health, rejection reason) through
    // a security-definer function — those columns are no longer granted to the
    // authenticated role directly, so strangers can't read them off approved rows.
    const { data: rows } = await supabase.rpc("get_my_startups" as never);
    const allStartups = (rows as unknown as Startup[] | null) ?? [];

    const startup = allStartups[0] ?? null;

    if (!startup) {
      return {
        userName, allStartups, startup: null,
        stats: { impressions: 0, clicks: 0 },
        chartData: [0, 0, 0, 0, 0, 0, 0],
        rank: null as number | null,
        recentShown: [] as RecentShown[],
        recentHosts: [] as RecentHost[],
        breakdown: { countries: [], devices: [], topReferrers: [] } as TrafficBreakdown,
      };
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
  logo_url?: string | null;
  widget_last_heartbeat_at?: string | null;
  membership_mode?: string | null;
  supporter_until?: string | null;
  supporter_cancel_at_period_end?: boolean | null;
  tracking_last_seen_at?: string | null;
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
  const TRACK = 80;
  return (
    <div className="flex gap-1.5 sm:gap-2">
      {data.map((v, i) => (
        <div
          key={i}
          className="relative flex flex-1 flex-col items-center"
          onMouseEnter={() => setTooltip({ idx: i })}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* fixed-height track so every bar sits on the same baseline */}
          <div className="flex w-full items-end justify-center" style={{ height: TRACK }}>
            {tooltip?.idx === i && (
              <div className="absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-2 py-1 text-[10px] font-medium text-white">
                {v.toLocaleString()} impression{v !== 1 ? "s" : ""} · {labels[i]}
              </div>
            )}
            <div
              className="w-full rounded-t-sm bg-black transition-all duration-500"
              style={{
                height: v > 0 ? `${Math.max((v / max) * TRACK, 4)}px` : "2px",
                opacity: v > 0 ? 1 : 0.12,
              }}
            />
          </div>
          {/* fixed-height label row keeps columns aligned even when a label is blank */}
          <span className="mt-1.5 flex h-3 items-center text-[9px] leading-none text-black/25">
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}


function DashboardPage() {
  const loaderData = Route.useLoaderData();
  const [allStartups, setAllStartups] = useState<Startup[]>(loaderData.allStartups);
  const [startup, setStartup] = useState<Startup | null>(loaderData.startup);
  const [stats, setStats] = useState<{ impressions: number; clicks: number }>(loaderData.stats);
  const [profileViews, setProfileViews] = useState<number | null>(null);
  const [recentShown, setRecentShown] = useState<RecentShown[]>(loaderData.recentShown ?? []);
  const [recentHosts, setRecentHosts] = useState<RecentHost[]>(loaderData.recentHosts ?? []);
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
  const [chartLabels, setChartLabels] = useState<string[]>(() => rollingLabels());
  const [range, setRange] = useState<RangeKey>("all");
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rank, setRank] = useState<number | null>(loaderData.rank);
  const [breakdown, setBreakdown] = useState<TrafficBreakdown>(loaderData.breakdown);
  const [liveTicker, setLiveTicker] = useState<{ country: string; device: string; ts: number } | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!startup) return;
    let cancelled = false;

    setRangeLoading(true);
    setProfileViews(null);

    const since = (() => {
      if (range === "all") return null;
      const d = new Date();
      if (range === "24h") d.setTime(d.getTime() - 24 * 3600 * 1000);
      else { d.setDate(d.getDate() - (range === "7d" ? 6 : 29)); d.setHours(0, 0, 0, 0); }
      return d;
    })();

    loadProfileViews(startup.id, since)
      .then((n) => { if (!cancelled) setProfileViews(n); })
      .catch(() => { if (!cancelled) setProfileViews(0); });

    loadRangeData(startup.id, range)
      .then((r) => {
        if (cancelled) return;
        setStats(r.stats);
        setChartData(r.chartData);
        setChartLabels(r.labels);
      })
      .finally(() => { if (!cancelled) setRangeLoading(false); });
    return () => { cancelled = true; };
  }, [range, startup?.id]);


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
            setRecentShown([]);
            setRecentHosts([]);
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
      setRecentShown([]);
      setRecentHosts([]);
    };
    window.addEventListener("startup-deleted", onDeleted);

    return () => {
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener("startup-deleted", onDeleted);
    };
  }, []);

  useEffect(() => {
    if (!startup) {
      setIsLive(false);
      return;
    }

    const channel = supabase
      .channel(`dashboard-live:${startup.id}:${crypto.randomUUID()}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "impressions",
        filter: `shown_startup_id=eq.${startup.id}`,
      }, (payload) => {
        const row = payload.new as { country: string | null; device: string | null; host_startup_id: string | null };
        const country = row.country ?? "Unknown";
        const device = row.device ?? "unknown";

        setLiveTicker({ country, device, ts: Date.now() });

        setBreakdown((prev) => {
          const countries = new Map(prev.countries.map((c) => [c.country, c.count]));
          countries.set(country, (countries.get(country) ?? 0) + 1);

          const devices = new Map(prev.devices.map((d) => [d.device, d.count]));
          devices.set(device, (devices.get(device) ?? 0) + 1);

          const topReferrers = row.host_startup_id
            ? prev.topReferrers.map((r) => r.id === row.host_startup_id ? { ...r, impressions: r.impressions + 1 } : r)
            : prev.topReferrers;

          return {
            countries: [...countries.entries()].map(([c, count]) => ({ country: c, count })).sort((a, b) => b.count - a.count).slice(0, 5),
            devices: [...devices.entries()].map(([d, count]) => ({ device: d, count })).sort((a, b) => b.count - a.count),
            topReferrers,
          };
        });

        setStats((prev) => ({ ...prev, impressions: prev.impressions + 1 }));
      })
      .subscribe((status) => setIsLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, [startup?.id]);

  useEffect(() => {
    if (!liveTicker) return;
    const t = setTimeout(() => setLiveTicker(null), 4000);
    return () => clearTimeout(t);
  }, [liveTicker]);

  async function checkInstall(siteUrl: string) {
    setInstallStatus("checking");
    try {
      const { data: sess } = await supabase.auth.getSession();
      let token = sess.session?.access_token;
      if (!token) {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) token = (await supabase.auth.getSession()).data.session?.access_token;
      }
      const res = await fetch(`/api/public/verify-install?url=${encodeURIComponent(siteUrl)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401) {
        setInstallStatus("unknown");
        return;
      }

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
    setRecentShown([]);
    setRecentHosts([]);
    setChartData(chartData.map(() => 0));
    setBreakdown({ countries: [], devices: [], topReferrers: [] });
    checkInstall(s.website_url);
    const extra = await loadDashboardData(s.id);
    // The range effect owns stats + chart for every window — don't clobber it here.

    setRank(extra.rank);
    setRecentShown(extra.recentShown);
    setRecentHosts(extra.recentHosts);
    setBreakdown(extra.breakdown);
  }

  const isSupporter = startup?.membership_mode === "supporter";
  const snippet = startup
    ? isSupporter
      ? `<script async src="https://startupbar.co/widget/loader.js" data-startup-id="${startup.id}" data-mode="track"></script>`
      : `<script async src="https://startupbar.co/widget/loader.js" data-startup-id="${startup.id}"></script>`
    : "";

  // Approved widget-mode listings only start collecting data once the script
  // is on their site. Until then every number is a truthful zero — say why.
  const needsInstall =
    !!startup && startup.status === "approved" && !isSupporter && installStatus === "disconnected";
  const mapLocked = needsInstall || (isSupporter && !startup?.tracking_last_seen_at);

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
              {startup.status === "approved" && (
                <div className="mt-3">
                  <PromoteButton startupId={startup.id} />
                </div>
              )}
            </div>

            {startup.status === "pending" && (
              startup.widget_last_heartbeat_at ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-800">
                  <strong>Changes under review</strong> · we re-approve within 24 hours. Your existing embed keeps loading on your site, but new impressions and clicks pause until it's approved again. Your stats below stay intact.
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-800">
                  <strong>Under review</strong> · we approve applications within 24 hours. Your embed script becomes available once you're approved.
                </div>
              )
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

            {startup.status === "approved" && (startup as any).slug && !((startup as any).founder_quote) && (
              <div className="flex flex-col md:flex-row items-center gap-5 md:gap-6 rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-secondary">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-[17px] font-semibold tracking-tight text-foreground">Your public page is missing your founder quote</p>
                  <p className="mt-0.5 max-w-lg text-sm leading-relaxed text-muted-foreground">Add one sentence on why you built it. Visitors trust profiles with a founder voice.</p>
                </div>
                <Link
                  to="/account"
                  className="shrink-0 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Add your story
                  <ArrowRight className="h-4 w-4 opacity-70" />
                </Link>
              </div>
            )}

            {needsInstall && (
              <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-[radial-gradient(120%_120%_at_0%_0%,#1b1b1b_0%,#000_55%)] p-6 text-white shadow-sm sm:p-8">
                <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/[0.06] blur-2xl" />
                <div className="relative">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    One step left
                  </span>
                  <h2 className="mt-4 text-[22px] font-semibold leading-tight tracking-tight sm:text-[26px]">
                    Your stats are at zero because the bar isn&rsquo;t live yet
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">
                    You&rsquo;re approved — the last step is pasting one line of code on {startup.name}. The moment it&rsquo;s live, your listing starts rotating across the network and impressions, clicks and your visitor map begin filling in.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5">
                      <code className="whitespace-nowrap font-mono text-[11px] text-white/70">{snippet}</code>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={copy}
                        className="sb-press inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied!" : "Copy script"}
                      </button>
                      <button
                        onClick={() => checkInstall(startup.website_url)}
                        className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-white/70 transition hover:border-white/35 hover:text-white"
                      >
                        Check now
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-white/35">
                    Paste it in the <code className="rounded bg-white/10 px-1 py-0.5 font-mono">&lt;head&gt;</code> of your site, publish, then hit Check now.
                  </p>
                </div>
              </div>
            )}


            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRange(opt.key)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all ${
                    range === opt.key
                      ? "border-black bg-black text-white"
                      : "border-black/10 bg-white text-black/50 hover:border-black/25 hover:text-black"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              {rangeLoading && <span className="ml-1 text-[11px] text-black/30">Updating…</span>}
            </div>

            <div className={`grid grid-cols-2 gap-4 lg:grid-cols-5 transition-opacity ${rangeLoading ? "opacity-60" : ""}`}>

              <StatCard icon={BarChart2} label="Impressions" value={stats.impressions.toLocaleString()} sub={RANGE_SUB[range]} />
              <StatCard icon={MousePointerClick} label="Clicks" value={stats.clicks.toLocaleString()} sub={RANGE_SUB[range]} />
              <StatCard icon={Percent} label="CTR" value={`${ctr}%`} sub="Click-through rate" />
              <StatCard icon={Eye} label="Profile views" value={profileViews === null ? "—" : profileViews.toLocaleString()} sub={`Your StartupBar page · ${RANGE_SUB[range].toLowerCase()}`} />
              <StatCard icon={BarChart2} label="Rank" value={rank ? `#${rank}` : "—"} sub="By impressions (all time)" />
            </div>

            <div className={`rounded-xl border border-black/8 bg-white p-6 transition-opacity ${rangeLoading ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-black">Impressions — {RANGE_CHART_TITLE[range]}</p>
                <span className="text-xs text-black/30">{RANGE_OPTIONS.find((o) => o.key === range)?.label}</span>
              </div>
              <div className="mt-6">
                <Sparkline data={chartData} labels={chartLabels} />
              </div>
            </div>

            {isSupporter && !startup.tracking_last_seen_at ? (
              <div className="relative overflow-hidden rounded-xl border border-black/8 bg-white">
                <div className="pointer-events-none select-none blur-[5px] opacity-60" aria-hidden="true">
                  <LiveVisitorMap scopeStartupId={startup.id} title="Live visitors on your startup" startupName={startup.name} startupLogoUrl={startup.logo_url ?? undefined} />
                </div>
                <div className="absolute inset-0 grid place-items-center bg-white/55 px-6 text-center">
                  <div className="max-w-sm">
                    <p className="text-sm font-semibold text-black">Your visitor map is locked</p>
                    <p className="mt-1 text-xs text-black/50">
                      Paste one line of code on your site to unlock your visitor map and on-site stats. Nothing is shown to your visitors.
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        onClick={copy}
                        className="sb-press inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-xs font-medium text-white transition hover:bg-black/85"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied!" : "Copy snippet"}
                      </button>
                      <button
                        onClick={() => checkInstall(startup.website_url)}
                        className="rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-black/60 transition hover:border-black/25 hover:text-black"
                      >
                        Check now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <LiveVisitorMap scopeStartupId={startup.id} title="Live visitors on your startup" startupName={startup.name} startupLogoUrl={startup.logo_url ?? undefined} />
            )}

            {(breakdown.countries.length > 0 || breakdown.topReferrers.length > 0) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isLive && (
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                        Live
                      </span>
                    )}
                  </div>
                  {liveTicker && (
                    <span key={liveTicker.ts} className="text-[11px] text-black/40 animate-in fade-in slide-in-from-right-2 duration-300">
                      New visitor from {liveTicker.country} · {liveTicker.device}
                    </span>
                  )}
                </div>

              <div className="grid gap-4 min-w-0">
                <div className="rounded-xl border border-black/8 bg-white p-6 min-w-0">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-black/30" />
                    <p className="text-sm font-semibold text-black">Top referring sites</p>
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {breakdown.topReferrers.length === 0 ? (
                      <p className="text-xs text-black/30">Not enough data yet.</p>
                    ) : breakdown.topReferrers.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 text-sm min-w-0">
                        <StartupFavicon url={r.website_url} name={r.name} size={16} className="rounded-sm shrink-0" />
                        <span className="truncate text-black/60">{r.name}</span>
                        <span className="ml-auto shrink-0 flex items-center gap-2 text-xs">
                          <span className="text-black/35">{r.impressions} impr</span>
                          <span className="font-medium text-black">{r.clicks} clicks</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              </div>
            )}

            {isSupporter && (
              <div className="rounded-xl border border-black/8 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-black">Membership</p>
                      <span className="rounded-full border border-black/10 bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/45">
                        Supporter
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-black/45">
                      You fund the network instead of showing the bar. Your listing rotates on member sites at an average share.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wide text-black/35">
                      {startup.supporter_cancel_at_period_end ? "Ends on" : "Renews on"}
                    </p>
                    <p className="text-sm font-semibold text-black">
                      {startup.supporter_until
                        ? new Date(startup.supporter_until).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                        : "—"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-black/40">
                  Manage or cancel your membership from your account page.
                </p>
              </div>
            )}

            <section className="grid min-w-0 grid-cols-12 gap-4" aria-label="Widget setup and recent activity">
              <div className="col-span-12 rounded-xl border border-black/8 bg-white p-5 shadow-sm sm:p-6">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/[0.04]">
                      <Code2 className="h-4 w-4 text-black/55" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-black">
                        {isSupporter ? "Analytics script (optional)" : "Embed script"}
                      </p>
                      <p className="mt-0.5 text-xs text-black/40">
                        {isSupporter
                          ? <>Optional. Paste once in the <code className="rounded bg-black/5 px-1 py-0.5 font-mono">&lt;head&gt;</code> of your site — it shows nothing to your visitors and unlocks your visitor map and on-site stats.</>
                          : <>Paste once in the <code className="rounded bg-black/5 px-1 py-0.5 font-mono">&lt;head&gt;</code> of your site.</>}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
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
                    isSupporter ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 text-[11px] font-medium text-black/45">
                        <span className="h-1.5 w-1.5 rounded-full bg-black/25" />
                        Not installed — optional
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Not detected
                      </span>
                    )
                  )}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0 overflow-x-auto rounded-lg border border-black/8 bg-black/[0.025] px-3 py-2.5">
                    <code className="whitespace-nowrap font-mono text-[11px] text-black/55">{snippet}</code>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={copy}
                    disabled={startup.status !== "approved"}
                    className="sb-press inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-2.5 text-xs font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
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
              </div>

              <div className="col-span-12 min-w-0 overflow-hidden rounded-xl border border-black/8 bg-white shadow-sm lg:col-span-6">
                <div className="border-b border-black/8 px-5 py-4 sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-black">Recently shown on your site</p>
                    <span className="shrink-0 rounded-md bg-black/[0.04] px-2 py-1 text-[10px] font-medium uppercase text-black/40">All · Last 7 days</span>
                  </div>
                  <p className="mt-1 text-xs text-black/40">Your bar rotates every 30 seconds, so each visitor can see a different member.</p>
                </div>
                {recentShown.length > 0 ? (
                  <ul className="max-h-[420px] divide-y divide-black/[0.06] overflow-y-auto">
                    {recentShown.map((s) => (
                      <li
                        key={s.startup_id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-black/[0.02] sm:px-6"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{s.name}</p>
                          <p className="truncate text-xs text-black/40">{s.description}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          <span className="rounded-md bg-black/[0.05] px-2 py-1 text-[11px] font-semibold tabular-nums text-black/55">
                            {s.appearance_count.toLocaleString()}× shown
                          </span>
                          <span className="text-[11px] text-black/30">{timeAgo(s.last_shown_at)}</span>
                           <a href={`/api/public/widget/click?id=${s.startup_id}&source=dashboard`} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${s.name}`}
                             className="grid h-7 w-7 place-items-center rounded-md text-black/30 transition-colors hover:bg-black/[0.05] hover:text-black">
                             <ArrowRight className="h-3.5 w-3.5 -rotate-45" />
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 py-6 text-sm text-black/35 sm:px-6">
                    {startup.status === "approved"
                      ? "Nothing shown yet — this fills in as visitors land on your site."
                      : "Will appear once your startup is approved."}
                  </p>
                )}

              </div>

              <div className="col-span-12 min-w-0 overflow-hidden rounded-xl border border-black/8 bg-white shadow-sm lg:col-span-6">
                <div className="border-b border-black/8 px-5 py-4 sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-black">Where your bar appears</p>
                    <span className="shrink-0 rounded-md bg-black/[0.04] px-2 py-1 text-[10px] font-medium uppercase text-black/40">All · Last 7 days</span>
                  </div>
                  <p className="mt-1 text-xs text-black/40">Sites that showed your listing. Your own site never shows you.</p>
                </div>
                  {recentHosts.length > 0 ? (
                    <ul className="max-h-[420px] divide-y divide-black/[0.06] overflow-y-auto">
                      {recentHosts.map((h) => (
                        <li
                          key={h.host_id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-black/[0.02] sm:px-6"
                        >
                          <p className="min-w-0 truncate text-sm font-medium">{h.name}</p>
                          <div className="flex shrink-0 items-center gap-2.5">
                            <span className="rounded-md bg-black/[0.05] px-2 py-1 text-[11px] font-semibold tabular-nums text-black/55">
                              {h.appearance_count.toLocaleString()}× shown
                            </span>
                            <span className="text-[11px] text-black/30">{timeAgo(h.last_shown_at)}</span>
                            <a href={`/api/public/widget/click?id=${h.host_id}&source=dashboard`} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${h.name}`}
                              className="grid h-7 w-7 place-items-center rounded-md text-black/30 transition-colors hover:bg-black/[0.05] hover:text-black">
                              <ArrowRight className="h-3.5 w-3.5 -rotate-45" />
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-5 py-6 text-sm text-black/35 sm:px-6">
                      No placements in the last 7 days yet.
                    </p>
                  )}
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
