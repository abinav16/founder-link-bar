import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SponsoredRail } from "@/components/SponsoredRail";
import { StartupFavicon } from "@/components/StartupFavicon";
import { getNetworkDashboard, type NetworkDashboardResult } from "@/lib/network-dashboard.functions";
import { ArrowUpRight, ArrowRight, Eye, Globe, Search, X } from "lucide-react";
import { useFeaturedStartupIds } from "@/lib/featured";


function NetworkPending() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="h-[220px] rounded-[9999px] bg-black/[0.06] animate-pulse" />
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-2.5 w-28 bg-black/[0.05] rounded-full" />
            <div className="flex-1 h-px bg-black/[0.04]" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-black/[0.06] p-6 animate-pulse space-y-5">
                <div className="w-11 h-11 rounded-xl bg-black/[0.05]" />
                <div className="space-y-2">
                  <div className="h-3.5 bg-black/[0.05] rounded-full w-1/2" />
                  <div className="h-2.5 bg-black/[0.03] rounded-full w-full" />
                  <div className="h-2.5 bg-black/[0.03] rounded-full w-3/4" />
                </div>
                <div className="h-px bg-black/[0.04]" />
                <div className="h-2.5 bg-black/[0.03] rounded-full w-1/3" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-2.5 w-24 bg-black/[0.05] rounded-full" />
            <div className="flex-1 h-px bg-black/[0.04]" />
          </div>
          <div className="rounded-2xl bg-white border border-black/[0.06] px-6 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3.5 border-b border-black/[0.05] last:border-0 animate-pulse">
                <div className="w-9 h-9 rounded-lg bg-black/[0.05] shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-black/[0.05] rounded-full w-1/3" />
                  <div className="h-2.5 bg-black/[0.03] rounded-full w-2/3" />
                </div>
                <div className="h-2.5 bg-black/[0.03] rounded-full w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export const Route = createFileRoute("/network")({
  head: () => ({
    meta: [
      { title: "Network — StartupBar" },
      { name: "description", content: "Explore the founder startups currently exchanging traffic on the StartupBar network." },
      { property: "og:title", content: "Network — StartupBar" },
      { property: "og:description", content: "Explore founder startups exchanging traffic on StartupBar." },
      { property: "og:url", content: "https://startupbar.co/network" },
    ],
    links: [{ rel: "canonical", href: "https://startupbar.co/network" }],
  }),
  loader: () => getNetworkDashboard({}),
  pendingMs: 0,
  pendingMinMs: 300,
  pendingComponent: NetworkPending,

  component: NetworkDashboardPage,
});

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

type Card = NetworkDashboardResult["recentStartups"][0];

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

function StartupProfileLink({ slug, children, className }: { slug: string; children: ReactNode; className?: string }) {
  const hydrated = useHydrated();
  const navigate = useNavigate();

  if (!hydrated) {
    return (
      <span aria-disabled="true" className={className}>
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/startup/$slug", params: { slug } })}
      className={className}
      style={{ appearance: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }}
    >
      {children}
    </button>
  );
}


function StartupCard({ s }: { s: Card }) {
  
  const sponsored = s.sponsored;
  const profileHref = s.slug ? `/startup/${s.slug}` : undefined;
  const visitHref = `/api/public/widget/click?id=${s.id}&source=dashboard`;
  return (
    <div
      className={[
        "group relative flex flex-col gap-2.5 sm:gap-3 rounded-2xl border p-4 sm:p-5 transition-all duration-300 h-full overflow-hidden",
        sponsored
          ? "sb-sponsored border-[oklch(0.72_0.13_75)] hover:shadow-[0_12px_48px_oklch(0.65_0.15_68_/_0.18)]"
          : "bg-white border-black/[0.06] hover:border-black/[0.12] hover:shadow-[0_12px_48px_rgba(0,0,0,0.07)]",
      ].join(" ")}
    >
      {profileHref && (
        <StartupProfileLink
          slug={s.slug!}
          className="absolute inset-0 z-0"
        >
          <span className="sr-only">View {s.name} profile</span>
        </StartupProfileLink>
      )}
      <div className="relative z-10 flex-1 min-w-0 pointer-events-none">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-black/[0.08] flex items-center justify-center shrink-0">
            <StartupFavicon url={s.website_url} name={s.name} logoUrl={s.logo_url} size={32} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold text-black leading-snug">{s.name}</h3>
              {sponsored ? (
                <span className="shrink-0 rounded-full bg-[oklch(0.65_0.15_68)] px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.12em] text-white shadow-sm">
                  Featured
                </span>
              ) : null}

            </div>
            <div className="mt-1 min-w-0">
              <FounderChip s={s} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <a
              href={visitHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${s.name} website`}
              title={`Visit ${s.name} website`}
              className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white text-black/50 transition-colors hover:border-black/30 hover:text-black"
            >
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
            {s.slug && (
              <StartupProfileLink
                slug={s.slug}
                className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-colors hover:bg-black/80"
              >
                <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
              </StartupProfileLink>
            )}
          </div>
        </div>
        <p className="mt-3 text-[13px] text-black/45 leading-relaxed line-clamp-2 sm:min-h-[2.9em]">{s.description}</p>
      </div>

      <div className="relative z-10 pointer-events-none">
        <div className="grid grid-cols-3 rounded-xl border border-black/[0.07] bg-black/[0.015] divide-x divide-black/[0.07]">
          <div className="flex flex-col items-center gap-0.5 py-2">
            <span className="text-[9px] uppercase tracking-[0.1em] font-semibold text-black/30">Joined</span>
            <span className="text-[13px] font-semibold text-black/70 tabular-nums">{joinedLabel(s.created_at)}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-2">
            <span className="text-[9px] uppercase tracking-[0.1em] font-semibold text-black/30">Impressions</span>
            <span className="text-[13px] font-semibold text-black/70 tabular-nums">{fmt(s.impressions)}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-2">
            <span className="text-[9px] uppercase tracking-[0.1em] font-semibold text-black/30">Clicks</span>
            <span className="text-[13px] font-semibold text-black/70 tabular-nums">{fmt(s.clicks)}</span>
          </div>
        </div>
      </div>

    </div>
  );
}


function daysSince(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function joinedLabel(createdAt: string) {
  const d = daysSince(createdAt);
  if (d === 0) return "Today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

function FounderChip({ s }: { s: Card }) {
  if (!s.founder_name) return null;
  return (
    <span className="flex w-full min-w-0 items-center gap-1.5">
      {s.founder_avatar_url ? (
        <img
          src={s.founder_avatar_url}
          alt=""
          width={18}
          height={18}
          loading="lazy"
          className="h-[18px] w-[18px] rounded-full object-cover bg-black/[0.06] shrink-0"
        />
      ) : (
        <span className="h-[18px] w-[18px] rounded-full bg-black/[0.06] text-black/45 text-[9px] font-semibold inline-flex items-center justify-center shrink-0">
          {s.founder_name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className="text-[11px] text-black/45 font-medium truncate">{s.founder_name}</span>
    </span>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-[13px] font-semibold text-black tabular-nums">{value}</span>
      <span className="text-[9px] text-black/30 uppercase tracking-[0.1em] font-semibold sm:hidden">{label}</span>
    </div>
  );
}

function StartupRow({ s }: { s: Card }) {
  const visitHref = `/api/public/widget/click?id=${s.id}&source=dashboard`;
  const sponsored = s.sponsored;
  return (
    <div className={`group relative py-4 border-b last:border-0 transition-colors duration-150 overflow-hidden ${sponsored ? "sb-featured-row rounded-xl border-b-0 my-1 px-3 border" : "border-black/[0.05]"}`}>
      {s.slug && (
        <StartupProfileLink slug={s.slug} className="absolute inset-0 z-0">
          <span className="sr-only">View {s.name} profile</span>
        </StartupProfileLink>
      )}

      <div className="relative z-10 flex items-start gap-3 sm:gap-4 pointer-events-none">
        <div className="shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-black/[0.03] border border-black/[0.06] flex items-center justify-center">
          <StartupFavicon url={s.website_url} name={s.name} logoUrl={s.logo_url} size={32} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <span className="text-sm font-semibold text-black truncate">{s.name}</span>
            {sponsored && (
              <span className="shrink-0 rounded-full bg-[oklch(0.65_0.15_68)] px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wide">Featured</span>
            )}
            <a
              href={visitHref}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] font-medium text-black/60 hover:text-black hover:border-black/30 transition-colors shrink-0"
            >
              <Globe className="h-3 w-3" strokeWidth={2} />
              <span className="sm:hidden">Visit</span>
              <span className="hidden sm:inline">Visit site</span>
              <ArrowUpRight className="h-2.5 w-2.5" strokeWidth={2.5} />
            </a>
          </div>
          <div className="mt-1.5 flex items-center gap-2 min-w-0">
            <FounderChip s={s} />
          </div>



        </div>

        <div className="shrink-0 flex items-center gap-4 sm:gap-6">
          <div className="w-[68px] hidden sm:flex justify-end">
            <Metric value={joinedLabel(s.created_at)} label="Joined" />
          </div>
          <div className="w-[84px] hidden sm:flex justify-end">
            <Metric value={fmt(s.impressions)} label="Impr" />
          </div>
          <div className="w-[56px] hidden sm:flex justify-end">
            <Metric value={fmt(s.clicks)} label="Clicks" />
          </div>
          {s.slug && (
            <StartupProfileLink
              slug={s.slug}
              className="pointer-events-auto inline-flex items-center justify-center h-7 w-7 rounded-full bg-black text-white hover:bg-black/80 transition-colors shrink-0"
            >
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
            </StartupProfileLink>
          )}
        </div>
      </div>

      <p className="relative z-10 mt-2.5 text-xs text-black/45 leading-relaxed pointer-events-none">
        {s.description}
      </p>

      <div className="relative z-10 sm:hidden mt-3 grid grid-cols-3 rounded-xl border border-black/[0.06] bg-black/[0.015] divide-x divide-black/[0.06] pointer-events-none">
        <div className="flex flex-col items-center gap-0.5 py-1.5">
          <span className="text-[9px] uppercase tracking-[0.1em] font-semibold text-black/30">Joined</span>
          <span className="text-[12px] font-semibold text-black/70 tabular-nums">{joinedLabel(s.created_at)}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-1.5">
          <span className="text-[9px] uppercase tracking-[0.1em] font-semibold text-black/30">Impressions</span>
          <span className="text-[12px] font-semibold text-black/70 tabular-nums">{fmt(s.impressions)}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-1.5">
          <span className="text-[9px] uppercase tracking-[0.1em] font-semibold text-black/30">Clicks</span>
          <span className="text-[12px] font-semibold text-black/70 tabular-nums">{fmt(s.clicks)}</span>
        </div>
      </div>

    </div>
  );
}


function SectionLabel({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <h2 className="text-[11px] font-semibold text-black/30 uppercase tracking-[0.12em] shrink-0">{title}</h2>
      {count !== undefined && (
        <span className="text-[11px] text-black/20 font-medium">{count}</span>
      )}
      <div className="flex-1 h-px bg-black/[0.05]" />
    </div>
  );
}

function PillStat({ value, label, small }: { value: string; label: string; small?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span style={{ color: "white", fontSize: small ? 16 : 22, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</span>
      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: small ? 7 : 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}


function MagneticField({ startups, stats }: { startups: { id: string; name: string; website_url: string }[]; stats?: { totalStartups: number; ctr: number; totalImpressions: number; totalClicks: number } }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stateRef = useRef<{ x: number; y: number; vx: number; vy: number; angle: number; av: number; homeY: number; size: number; snapped: boolean; snapCooldown: number; resting: boolean; sleepT: number; asleep: boolean }[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const startupKey = useMemo(() => startups.map(s => s.id).join(","), [startups]);

  const GRAVITY = 0.5;
  const GROUND_FRICTION = 0.84;
  const AIR_DAMPING = 0.93;
  const ATTRACT_K = 0.012;
  const ATTRACT_RADIUS = 260;
  const MAX_THREAD = 220;
  const SNAP_COOLDOWN = 80;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || startups.length === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width: w, height: h } = container.getBoundingClientRect();
    sizeRef.current = { w, h };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const NODE_SIZE = w < 500 ? 26 : 38;
    const n = startups.length;

    nodeRefs.current.forEach(el => {
      if (!el) return;
      el.style.width = `${NODE_SIZE}px`;
      el.style.height = `${NODE_SIZE}px`;
      const inner = el.firstElementChild as HTMLElement;
      if (inner) { inner.style.width = `${NODE_SIZE}px`; inner.style.height = `${NODE_SIZE}px`; }
    });

    const logoR = NODE_SIZE / 2 + 3;
    const pillR = h / 2;
    const homeY = h - logoR - 2;

    const nodes = startups.map(() => {
      const x = logoR + Math.random() * (w - 2 * logoR);
      const y = logoR + Math.random() * (h * 0.35);
      const vx = (Math.random() - 0.5) * 1.5;
      return { x, y, vx, vy: 0, angle: 0, av: 0, homeY, size: NODE_SIZE, snapped: false, snapCooldown: 0, resting: false, sleepT: 0, asleep: false };
    });
    stateRef.current = nodes;

    nodes.forEach((node, i) => {
      const el = nodeRefs.current[i];
      if (el) el.style.transform = `translate(${node.x - node.size / 2}px, ${node.y - node.size / 2}px) rotate(0rad)`;
    });

    let lastT = performance.now();
    function tick(now: number) {
      // dt in units of "60fps frames"; clamp so a stalled tab doesn't teleport nodes.
      const dt = Math.min(Math.max((now - lastT) / 16.6667, 0.5), 3);
      lastT = now;
      const mouse = mouseRef.current;
      const nodes = stateRef.current;

      ctx.clearRect(0, 0, w, h);
      const mouseActive = mouse.x > 0 && mouse.x < w && mouse.y > 0 && mouse.y < h;
      const { w: sw, h: sh } = sizeRef.current;
      const pillR = sh / 2;

      // ---- 1. wake bodies the cursor comes near ----
      if (mouseActive) {
        nodes.forEach((node) => {
          const dx = mouse.x - node.x, dy = mouse.y - node.y;
          if (dx * dx + dy * dy < ATTRACT_RADIUS * ATTRACT_RADIUS) { node.asleep = false; node.sleepT = 0; }
        });
      }

      // ---- 2. integrate forces ----
      nodes.forEach((node) => {
        if (node.asleep) return;
        const r = node.size / 2;

        if (node.snapped) {
          node.snapCooldown -= dt;
          if (node.snapCooldown <= 0) node.snapped = false;
        }

        if (mouseActive && !node.snapped) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < ATTRACT_RADIUS) {
            const force = ATTRACT_K * dist * dt;
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
            if (dist > MAX_THREAD) {
              node.snapped = true;
              node.snapCooldown = SNAP_COOLDOWN;
              node.vx -= (dx / dist) * 6;
              node.vy -= (dy / dist) * 6;
            }
          }
        }

        node.vy += GRAVITY * dt;
        node.vx *= Math.pow(AIR_DAMPING, dt);
        node.vy *= Math.pow(AIR_DAMPING, dt);
        node.av *= Math.pow(0.98, dt);
        node.x += node.vx * dt;
        node.y += node.vy * dt;
        void r;
      });

      // ---- 3. boundary constraints (floor, ceiling, rounded pill ends) ----
      function solveBounds(node: typeof nodes[number]) {
        const r = node.size / 2;
        const margin = r + r;

        if (node.y > node.homeY) {
          node.y = node.homeY;
          if (node.vy > 0) node.vy = 0;
        }
        if (node.y < margin) { node.y = margin; if (node.vy < 0) node.vy = Math.abs(node.vy) * 0.5; node.av *= -0.5; }

        if (node.x < pillR) {
          const cdx = node.x - pillR, cdy = node.y - sh / 2;
          const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 0.01;
          if (cd > pillR - margin) {
            const nx = cdx / cd, ny = cdy / cd;
            node.x = pillR + nx * (pillR - margin);
            node.y = sh / 2 + ny * (pillR - margin);
            const dot = node.vx * nx + node.vy * ny;
            if (dot > 0) { node.vx -= dot * nx * 1.2; node.vy -= dot * ny * 1.2; }
            node.av = -node.vx / r;
          }
        } else if (node.x > sw - pillR) {
          const cdx = node.x - (sw - pillR), cdy = node.y - sh / 2;
          const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 0.01;
          if (cd > pillR - margin) {
            const nx = cdx / cd, ny = cdy / cd;
            node.x = (sw - pillR) + nx * (pillR - margin);
            node.y = sh / 2 + ny * (pillR - margin);
            const dot = node.vx * nx + node.vy * ny;
            if (dot > 0) { node.vx -= dot * nx * 1.2; node.vy -= dot * ny * 1.2; }
            node.av = -node.vx / r;
          }
        }
      }

      nodes.forEach(solveBounds);

      // ---- 4. iterative soft separation with penetration slop ----
      const SLOP = 0.5;
      const CORRECTION = 0.65;
      const ITER = 4;
      const contacts: { nx: number; ny: number; other: number }[][] = nodes.map(() => []);
      for (let it = 0; it < ITER; it++) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            const minDist = (a.size + b.size) / 2 + 2;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
            if (dist >= minDist) continue;

            const nx = dx / dist, ny = dy / dist;
            const penetration = minDist - dist;

            // contact bookkeeping: y grows downward, so ny > 0 means b sits below a → b may support a
            if (it === 0) {
              if (ny > 0.35) contacts[i].push({ nx, ny, other: j });
              if (ny < -0.35) contacts[j].push({ nx: -nx, ny: -ny, other: i });
            }


            if (penetration > SLOP) {
              const total = (penetration - SLOP) * CORRECTION;
              const aFree = !a.asleep, bFree = !b.asleep;
              if (aFree && bFree) {
                a.x -= nx * total * 0.5; a.y -= ny * total * 0.5;
                b.x += nx * total * 0.5; b.y += ny * total * 0.5;
              } else if (aFree) {
                a.x -= nx * total; a.y -= ny * total;
              } else if (bFree) {
                b.x += nx * total; b.y += ny * total;
              }
            }


            if (it === 0) {
              const dot = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (dot > 0) {
                if (!a.asleep) { a.vx -= dot * nx * 0.45; a.vy -= dot * ny * 0.45; }
                if (!b.asleep) { b.vx += dot * nx * 0.45; b.vy += dot * ny * 0.45; }
                if (dot > 0.6) { a.asleep = false; b.asleep = false; a.sleepT = 0; b.sleepT = 0; }
              }
            }
          }
        }
        nodes.forEach(solveBounds);
      }

      // ---- 5. support chain: only bodies whose support traces down to the floor can rest ----
      const onFloorArr = nodes.map((node) => node.y >= node.homeY - 0.75);
      const grounded = onFloorArr.slice();
      for (let pass = 0; pass < 6; pass++) {
        let changed = false;
        for (let i = 0; i < nodes.length; i++) {
          if (grounded[i]) continue;
          const cs = contacts[i].filter((c) => grounded[c.other]);
          if (cs.length === 0) continue;
          // stable if propped from almost directly below, or wedged between two supports
          const steep = cs.some((c) => c.ny > 0.88);
          const wedged = cs.some((c) => c.nx > 0.15) && cs.some((c) => c.nx < -0.15);
          if (steep || wedged) { grounded[i] = true; changed = true; }
        }
        if (!changed) break;
      }

      // ---- 6. friction, rolling, sleep ----
      nodes.forEach((node, i) => {
        const r = node.size / 2;
        node.resting = grounded[i];

        if (node.resting) {
          if (node.vy > 0) node.vy = 0;
          node.av = node.vx / r;
          node.vx *= Math.pow(GROUND_FRICTION, dt);
          if (Math.abs(node.vx) < 0.03) { node.vx = 0; node.av = 0; }
        } else {
          // unsupported or perched on a slope: let gravity keep working, roll off naturally
          node.av += (node.vx / r - node.av) * 0.1 * dt;
        }

        node.angle += node.av * dt;

        const speed = Math.abs(node.vx) + Math.abs(node.vy);
        if (node.resting && speed < 0.05 && !node.snapped) {
          node.sleepT += dt;
          if (node.sleepT > 20) { node.asleep = true; node.vx = 0; node.vy = 0; node.av = 0; }
        } else {
          node.sleepT = 0;
          node.asleep = false;
        }

      });


      // ---- 6. cursor threads ----
      if (mouseActive) {
        nodes.forEach((node) => {
          if (node.snapped) return;
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > ATTRACT_RADIUS) return;

          const stretch = Math.min(dist / MAX_THREAD, 1);
          const alpha = 0.88 * (1 - stretch * 0.6);

          const sag = dist * 0.12;
          const mx = (node.x + mouse.x) / 2;
          const my = (node.y + mouse.y) / 2 + sag;

          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.quadraticCurveTo(mx, my, mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        });
      }

      nodes.forEach((node, i) => {
        const el = nodeRefs.current[i];
        if (el) el.style.transform = `translate(${(node.x - node.size / 2).toFixed(2)}px, ${(node.y - node.size / 2).toFixed(2)}px) rotate(${node.angle.toFixed(4)}rad)`;
      });


      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      if (!container || !canvas) return;
      const { width: nw, height: nh } = container.getBoundingClientRect();
      canvas.width = Math.round(nw * dpr);
      canvas.height = Math.round(nh * dpr);
      canvas.style.width = `${nw}px`;
      canvas.style.height = `${nh}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w: nw, h: nh };
      // layout changed: refresh the floor and wake every body so the pile re-settles
      stateRef.current.forEach((node) => {
        node.homeY = nh - (node.size / 2 + 3) - 2;
        node.asleep = false;
        node.sleepT = 0;
      });

    });

    ro.observe(container);

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [startupKey]);

  function onMouseMove(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseLeave={() => { mouseRef.current = { x: -9999, y: -9999 }; }}
      className="relative overflow-hidden select-none h-[160px] sm:h-[220px]"
      style={{ background: "#09090b", borderRadius: 9999, transform: "translateZ(0)" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />

      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.03) 0%, transparent 70%)",
        zIndex: 2,
      }} />

      <div className="absolute bottom-0 inset-x-0" style={{ height: 48, background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)", zIndex: 3 }} />
      <div className="absolute bottom-[16px] inset-x-8" style={{ height: 1, background: "rgba(255,255,255,0.06)", zIndex: 3 }} />

      <div className="absolute inset-x-0 pointer-events-none" style={{ top: "50%", left: 0, right: 0, transform: "translateY(-50%)", zIndex: 6 }}>
        <div className="hidden sm:grid w-full items-center px-14" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
          <div className="flex justify-center">
            <div className="flex items-stretch divide-x divide-white/10 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
              <div className="px-5 py-2.5">
                <PillStat value={stats ? String(stats.totalStartups) : "—"} label="Startups" />
              </div>
              <div className="px-5 py-2.5">
                <PillStat value={stats ? `${stats.ctr}%` : "—"} label="Network CTR" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 mx-4 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div style={{ width: 22, height: 5, background: "white", borderRadius: 3 }} />
            <span style={{ color: "white", fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>StartupBar</span>
          </div>
          <div className="flex justify-center">
            <div className="flex items-stretch divide-x divide-white/10 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
              <div className="px-5 py-2.5">
                <PillStat value={stats ? fmt(stats.totalImpressions) : "—"} label="Impressions" />
              </div>
              <div className="px-5 py-2.5">
                <PillStat value={stats ? fmt(stats.totalClicks) : "—"} label="Total Clicks" />
              </div>
            </div>
          </div>
        </div>

        <div className="sm:hidden flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div style={{ width: 14, height: 3, background: "white", borderRadius: 3 }} />
            <span style={{ color: "white", fontSize: 15, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>StartupBar</span>
          </div>
          <div className="w-full px-4 flex justify-center">
            <div className="flex items-stretch divide-x divide-white/10 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
              <div className="px-2.5 py-1.5">
                <PillStat small value={stats ? String(stats.totalStartups) : "—"} label="Startups" />
              </div>
              <div className="px-2.5 py-1.5">
                <PillStat small value={stats ? `${stats.ctr}%` : "—"} label="CTR" />
              </div>
              <div className="px-2.5 py-1.5">
                <PillStat small value={stats ? fmt(stats.totalImpressions) : "—"} label="Impr" />
              </div>
              <div className="px-2.5 py-1.5">
                <PillStat small value={stats ? fmt(stats.totalClicks) : "—"} label="Clicks" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {startups.map((s, i) => {
        const domain = (() => { try { return new URL(s.website_url.startsWith("http") ? s.website_url : `https://${s.website_url}`).hostname.replace(/^www\./, ""); } catch { return s.website_url; } })();
        const imgUrl = (s as any).logo_url || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        return (
          <div
            key={s.id}
            ref={el => { nodeRefs.current[i] = el; }}
            className="absolute top-0 left-0"
            style={{ width: 38, height: 38, zIndex: 5 }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                background: `white url(${imgUrl}) center/cover no-repeat`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function HorizontalCardRail({ items }: { items: Card[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollLeft = 0;
  }, [items]);
  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="sb-rail flex items-stretch gap-4 overflow-x-auto snap-x pb-3"
      >
        {items.map((s) => (
          <div
            key={s.id}
            className="snap-start shrink-0 w-[280px] sm:w-[calc((100%-1rem)/2)] xl:w-[calc((100%-2rem)/3)]"
          >
            <StartupCard s={s} />
          </div>
        ))}

      </div>
    </div>
  );
}

type SortKey = "joined" | "impressions" | "clicks";
type SortDir = "asc" | "desc";
type FeaturedFilter = "all" | "featured";

const SORT_COLUMNS: { key: SortKey; label: string; hint: string; width: string }[] = [
  { key: "joined", label: "Joined", hint: "How long ago this startup joined the network.", width: "w-[68px]" },
  { key: "impressions", label: "Impressions", hint: "Total times this startup has been shown across the network.", width: "w-[84px]" },
  { key: "clicks", label: "Clicks", hint: "Total clicks this startup has received from the network.", width: "w-[56px]" },
];

function SortHeader({
  col,
  active,
  dir,
  onClick,
}: {
  col: (typeof SORT_COLUMNS)[number];
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={col.hint}
      className={`${col.width} flex items-center justify-end gap-1 text-[10px] uppercase tracking-[0.1em] font-semibold transition-colors ${
        active ? "text-black" : "text-black/30 hover:text-black/60"
      }`}
    >
      <span className="truncate">{col.label}</span>
      {active && (
        <ArrowRight
          className={`h-2.5 w-2.5 shrink-0 ${dir === "desc" ? "rotate-90" : "-rotate-90"}`}
          strokeWidth={3}
        />
      )}
    </button>
  );
}

function NetworkDashboardPage() {
  const data = Route.useLoaderData() as NetworkDashboardResult;
  const stats = data?.stats;
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>("all");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const featuredIds = useFeaturedStartupIds();
  const allStartups = useMemo(
    () =>
      data.recentStartups.map((s) =>
        featuredIds.has(s.id) && !s.sponsored ? { ...s, sponsored: true } : s,
      ),
    [data.recentStartups, featuredIds],
  );
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    let base = q
      ? allStartups.filter((s) =>
          `${s.name} ${s.description} ${s.website_url}`.toLowerCase().includes(q),
        )
      : allStartups;

    if (featuredFilter === "featured") {
      base = base.filter((s) => s.sponsored);
    }

    const sorted = [...base];
    const sign = sortDir === "desc" ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "impressions":
          return sign * ((b.impressions ?? 0) - (a.impressions ?? 0));
        case "clicks":
          return sign * ((b.clicks ?? 0) - (a.clicks ?? 0));
        default:
          // "desc" on Joined = newest first
          return sign * (new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    });
    return sorted;
  }, [allStartups, q, sortKey, sortDir, featuredFilter]);


  const trending = (() => {
    const active = allStartups.filter(
      (s) => (s.clicks_24h ?? 0) > 0 || (s.impressions_24h ?? 0) > 0,
    );
    const sorted = [...active].sort(
      (a, b) =>
        (b.clicks_24h ?? 0) - (a.clicks_24h ?? 0) ||
        (b.impressions_24h ?? 0) - (a.impressions_24h ?? 0),
    );
    return sorted.slice(0, 3);
  })();

  const newThisWeek = useMemo(
    () =>
      data.newThisWeek.map((s) =>
        featuredIds.has(s.id) && !s.sponsored ? { ...s, sponsored: true } : s,
      ),
    [data.newThisWeek, featuredIds],
  );

  return (
    <DashboardLayout rail={<SponsoredRail />}>
      <div className="space-y-10">
        {data.recentStartups.length > 0 && (
          <MagneticField startups={data.recentStartups} stats={stats} />
        )}

        {trending.length > 1 && (
          <div>
            <SectionLabel title="Trending — last 24h" />
            <div className="sm:hidden">
              <HorizontalCardRail items={trending} />
            </div>
            <div className="hidden sm:grid gap-4 sm:grid-cols-3">
              {trending.map((s) => <StartupCard key={s.id} s={s} />)}
            </div>
          </div>
        )}


        {data.newThisWeek.length > 0 && (
          <div>
            <SectionLabel title="New This Week" count={data.newThisWeek.length} />
            <HorizontalCardRail items={newThisWeek} />
          </div>
        )}

        <div>
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-[11px] font-semibold text-black/30 uppercase tracking-[0.12em] shrink-0">Startups in Network</h2>
              <span className="text-[11px] text-black/20 font-medium">{allStartups.length}</span>
              <div className="hidden sm:block flex-1 h-px bg-black/[0.05]" />
            </div>
            <div className="relative shrink-0 w-full sm:w-[280px] sm:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/30" strokeWidth={2} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search startups…"
                className="w-full h-9 pl-9 pr-8 rounded-full border border-black/10 bg-white text-[13px] text-black placeholder:text-black/30 focus:outline-none focus:border-black/30 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-5 w-5 rounded-full text-black/40 hover:text-black hover:bg-black/[0.06] transition-colors"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>

          {/* Sort & filter controls (all viewports) */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.1em] font-semibold text-black/30">Sort</span>
              <select
                value={`${sortKey}:${sortDir}`}
                onChange={(e) => {
                  const [k, d] = e.target.value.split(":") as [SortKey, SortDir];
                  setSortKey(k);
                  setSortDir(d);
                }}
                className="h-8 rounded-full border border-black/10 bg-white px-3 text-[12px] text-black focus:outline-none focus:border-black/30"
              >
                <option value="joined:desc">Newest first</option>
                <option value="joined:asc">Oldest first</option>
                <option value="impressions:desc">Most impressions</option>
                <option value="impressions:asc">Fewest impressions</option>
                <option value="clicks:desc">Most clicks</option>
                <option value="clicks:asc">Fewest clicks</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.1em] font-semibold text-black/30">Filter</span>
              <select
                value={featuredFilter}
                onChange={(e) => setFeaturedFilter(e.target.value as FeaturedFilter)}
                className="h-8 rounded-full border border-black/10 bg-white px-3 text-[12px] text-black focus:outline-none focus:border-black/30"
              >
                <option value="all">All startups</option>
                <option value="featured">Featured only</option>
              </select>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="rounded-2xl bg-white border border-black/[0.06] px-4 sm:px-6 py-2">
              {/* Column headers (desktop) */}
              <div className="hidden sm:flex items-center gap-4 pt-3 pb-2.5 border-b border-black/[0.06]">
                <div className="flex-1 min-w-0 flex items-baseline gap-2">
                  <span className="text-[10px] uppercase tracking-[0.1em] font-semibold text-black/30">Startup</span>
                  <span className="text-[11px] text-black/25 truncate">
                    Showing {filtered.length} of {allStartups.length} · sorted by{" "}
                    {SORT_COLUMNS.find((c) => c.key === sortKey)?.label.toLowerCase()}{" "}
                    {sortKey === "joined"
                      ? sortDir === "desc" ? "(newest first)" : "(oldest first)"
                      : sortDir === "desc" ? "(high to low)" : "(low to high)"}
                  </span>
                </div>

                <div className="shrink-0 flex items-center gap-4 sm:gap-6">
                  {SORT_COLUMNS.map((col) => (
                    <SortHeader
                      key={col.key}
                      col={col}
                      active={sortKey === col.key}
                      dir={sortDir}
                      onClick={() => toggleSort(col.key)}
                    />
                  ))}
                  <span className="h-7 w-7 shrink-0" aria-hidden="true" />
                </div>
              </div>
              {filtered.map((s) => <StartupRow key={s.id} s={s} />)}
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-black/[0.06] px-6 py-16 text-center">
              <p className="text-sm text-black/60 font-medium">No startups match "{query}"</p>
              <p className="mt-1.5 text-[13px] text-black/35">Try a shorter word, or browse the full network.</p>
              <button
                type="button"
                onClick={() => { setQuery(""); setSortKey("joined"); setSortDir("desc"); }}

                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/85 transition-colors"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

