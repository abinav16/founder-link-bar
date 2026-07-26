import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StartupFavicon } from "@/components/StartupFavicon";
import { getNetworkDashboard, type NetworkDashboardResult } from "@/lib/network-dashboard.functions";
import { ArrowUpRight, ArrowRight, Eye, Globe, Search, X } from "lucide-react";


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

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function StartupCard({ s }: { s: Card }) {
  const fresh = isNew(s.created_at);
  const profileHref = s.slug ? `/startup/${s.slug}` : undefined;
  const visitHref = `/api/public/widget/click?id=${s.id}&source=dashboard`;
  return (
    <div className="group relative flex flex-col gap-3 sm:gap-5 rounded-2xl bg-white border border-black/[0.06] p-4 sm:p-6 hover:border-black/[0.12] hover:shadow-[0_12px_48px_rgba(0,0,0,0.07)] transition-all duration-300 h-full">
      {profileHref && (
        <StartupProfileLink
          slug={s.slug!}
          className="absolute inset-0 z-0"
        >
          <span className="sr-only">View {s.name} profile</span>
        </StartupProfileLink>
      )}
      {fresh && (
        <span className="absolute top-3 right-3 z-20 text-[9px] font-semibold tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-full bg-black text-white leading-none">
          New
        </span>
      )}
      <div className="relative z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-black/[0.03] border border-black/[0.06] flex items-center justify-center shrink-0 pointer-events-none">
        <StartupFavicon url={s.website_url} name={s.name} logoUrl={s.logo_url} size={36} />
      </div>

      <div className="relative z-10 flex-1 min-w-0 space-y-1 pointer-events-none">
        <div className="flex items-start justify-between gap-1">
          <h3 className="text-[13px] sm:text-[15px] font-semibold text-black leading-snug">{s.name}</h3>
          <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-black/20 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
        <p className="text-[11px] sm:text-[13px] text-black/45 leading-relaxed line-clamp-2">{s.description}</p>
      </div>

      <div className="relative z-10 hidden sm:flex items-center justify-between border-t border-black/[0.05] pt-4 pointer-events-none">
        {s.impressions_24h > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-black/35 font-medium tabular-nums">{s.impressions_24h} impressions today</span>
            {s.clicks_24h > 0 && <span className="text-[11px] text-black/20">· {s.clicks_24h} clicks</span>}
          </div>
        ) : (
          <span className="text-[11px] text-black/20 tracking-wide">Just joined</span>
        )}
        <div className="flex items-center gap-1.5">
          <a
            href={visitHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${s.name} website`}
            title="Visit website"
            className="pointer-events-auto inline-flex items-center justify-center h-7 w-7 rounded-full border border-black/10 bg-white text-black/60 hover:text-black hover:border-black/30 transition-colors"
          >
            <Globe className="h-3.5 w-3.5" strokeWidth={2} />
          </a>
          {s.slug && (
            <StartupProfileLink
              slug={s.slug}
              className="pointer-events-auto inline-flex items-center justify-center h-7 w-7 rounded-full bg-black text-white hover:bg-black/80 transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
            </StartupProfileLink>
          )}
        </div>
      </div>
    </div>
  );
}


function StartupRow({ s }: { s: Card }) {
  const visitHref = `/api/public/widget/click?id=${s.id}&source=dashboard`;
  return (
    <div className="group relative flex items-center gap-4 py-3.5 border-b border-black/[0.05] last:border-0 transition-colors duration-150">
      {s.slug && (
        <StartupProfileLink
          slug={s.slug}
          className="absolute inset-0 z-0"
        >
          <span className="sr-only">View {s.name} profile</span>
        </StartupProfileLink>
      )}
      <div className="relative z-10 shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-black/[0.03] border border-black/[0.06] flex items-center justify-center pointer-events-none">
        <StartupFavicon url={s.website_url} name={s.name} logoUrl={s.logo_url} size={32} />
      </div>
      <div className="relative z-10 min-w-0 flex-1 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-black truncate">{s.name}</span>
          <ArrowUpRight className="h-3 w-3 text-black/20 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
        </div>
        <p className="text-xs text-black/38 truncate mt-0.5 leading-relaxed">{s.description}</p>
      </div>
      <div className="relative z-10 shrink-0 text-right flex items-center gap-3">
        {s.impressions_24h > 0
          ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-black/35 font-medium tabular-nums">
              <Eye className="h-3 w-3 text-black/30" strokeWidth={2} />
              {s.impressions_24h}
            </span>
          )
          : <span className="text-[11px] text-black/18 tracking-wide">New</span>}
        <a
          href={visitHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit ${s.name} website`}
          title="Visit website"
          className="pointer-events-auto inline-flex items-center justify-center h-7 w-7 rounded-full border border-black/10 bg-white text-black/60 hover:text-black hover:border-black/30 transition-colors"
        >
          <Globe className="h-3.5 w-3.5" strokeWidth={2} />
        </a>
        {s.slug && (
          <StartupProfileLink
            slug={s.slug}
            className="pointer-events-auto inline-flex items-center justify-center h-7 w-7 rounded-full bg-black text-white hover:bg-black/80 transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
          </StartupProfileLink>
        )}
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
  const stateRef = useRef<{ x: number; y: number; vx: number; vy: number; angle: number; av: number; homeY: number; size: number; snapped: boolean; snapCooldown: number }[]>([]);
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
      return { x, y, vx, vy: 0, angle: 0, av: 0, homeY, size: NODE_SIZE, snapped: false, snapCooldown: 0 };
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


      nodes.forEach((node) => {
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
        node.x += node.vx * dt;
        node.y += node.vy * dt;

        const { w: sw, h: sh } = sizeRef.current;
        const pillR = sh / 2;
        const margin = r + r;

        const onGround = node.y >= node.homeY;
        if (onGround) {
          node.y = node.homeY;
          node.vy = 0;
          node.av = node.vx / r;
          node.vx *= Math.pow(GROUND_FRICTION, dt);
          // kill jitter: stop tiny residual motion
          if (Math.abs(node.vx) < 0.03) { node.vx = 0; node.av = 0; }
        } else {
          node.vx *= Math.pow(AIR_DAMPING, dt);
          node.vy *= Math.pow(AIR_DAMPING, dt);
          node.av *= Math.pow(0.98, dt);
        }

        if (node.y < margin) { node.y = margin; node.vy = Math.abs(node.vy) * 0.5; node.av *= -0.5; }

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

        node.angle += node.av * dt;
      });


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

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const minDist = (a.size + b.size) / 2 + 2;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          if (dist < minDist) {
            const overlap = (minDist - dist) / 2;
            const nx = dx / dist, ny = dy / dist;
            a.x -= nx * overlap; a.y -= ny * overlap;
            b.x += nx * overlap; b.y += ny * overlap;
            const dot = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (dot > 0) {
              a.vx -= dot * nx * 0.65; a.vy -= dot * ny * 0.65;
              b.vx += dot * nx * 0.65; b.vy += dot * ny * 0.65;
            }
          }
        }
      }

      // post-collision clamp: keep resting nodes glued to the ground so they don't jitter
      nodes.forEach((node) => {
        if (node.y > node.homeY) { node.y = node.homeY; node.vy = 0; }
      });

      nodes.forEach((node, i) => {
        const el = nodeRefs.current[i];
        if (el) el.style.transform = `translate(${Math.round(node.x - node.size / 2)}px, ${Math.round(node.y - node.size / 2)}px) rotate(${node.angle}rad)`;
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
          <div className="flex items-center gap-10 justify-center">
            <PillStat value={stats ? String(stats.totalStartups) : "—"} label="Startups" />
            <PillStat value={stats ? `${stats.ctr}%` : "—"} label="Network CTR" />
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: 22, height: 5, background: "white", borderRadius: 3 }} />
            <span style={{ color: "white", fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>StartupBar</span>
          </div>
          <div className="flex items-center gap-10 justify-center">
            <PillStat value={stats ? fmt(stats.totalImpressions) : "—"} label="Impressions" />
            <PillStat value={stats ? fmt(stats.totalClicks) : "—"} label="Total Clicks" />
          </div>
        </div>
        <div className="sm:hidden flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div style={{ width: 14, height: 3, background: "white", borderRadius: 3 }} />
            <span style={{ color: "white", fontSize: 15, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>StartupBar</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <PillStat small value={stats ? String(stats.totalStartups) : "—"} label="Startups" />
            </div>
            <div className="px-2 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <PillStat small value={stats ? `${stats.ctr}%` : "—"} label="CTR" />
            </div>
            <div className="px-2 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <PillStat small value={stats ? fmt(stats.totalImpressions) : "—"} label="Impressions" />
            </div>
            <div className="px-2 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <PillStat small value={stats ? fmt(stats.totalClicks) : "—"} label="Clicks" />
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
        className="sb-rail flex gap-4 overflow-x-auto snap-x pb-3"
      >
        {items.map((s) => (
          <div
            key={s.id}
            className="snap-start shrink-0 w-[280px] sm:w-[340px]"
          >
            <StartupCard s={s} />
          </div>
        ))}
      </div>
    </div>
  );
}

function NetworkDashboardPage() {
  const data = Route.useLoaderData() as NetworkDashboardResult;
  const stats = data?.stats;
  const [query, setQuery] = useState("");

  const allStartups = data.recentStartups;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? allStartups.filter((s) => {
        const hay = `${s.name} ${s.description} ${s.website_url}`.toLowerCase();
        return hay.includes(q);
      })
    : allStartups;

  const trending = [...allStartups]
    .filter((s) => (s.clicks_24h ?? 0) > 0)
    .sort((a, b) => (b.clicks_24h ?? 0) - (a.clicks_24h ?? 0) || (b.impressions_24h ?? 0) - (a.impressions_24h ?? 0))
    .slice(0, 3);

  return (
    <DashboardLayout>
      <div className="space-y-10">
        {data.recentStartups.length > 0 && (
          <MagneticField startups={data.recentStartups} stats={stats} />
        )}

        {trending.length > 0 && (
          <div>
            <SectionLabel title="Trending Today" count={trending.length} />
            <div className="sm:hidden rounded-2xl bg-white border border-black/[0.06] px-4 py-2">
              {trending.map((s) => <StartupRow key={s.id} s={s} />)}
            </div>
            <div className="hidden sm:grid gap-4 sm:grid-cols-3">
              {trending.map((s) => <StartupCard key={s.id} s={s} />)}
            </div>
          </div>
        )}


        {data.newThisWeek.length > 0 && (
          <div>
            <SectionLabel title="New This Week" count={data.newThisWeek.length} />
            <HorizontalCardRail items={data.newThisWeek} />
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
          {filtered.length > 0 ? (
            <div className="rounded-2xl bg-white border border-black/[0.06] px-4 sm:px-6 py-2">
              {filtered.map((s) => <StartupRow key={s.id} s={s} />)}
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-black/[0.06] px-6 py-16 text-center">
              <p className="text-sm text-black/40">No startups match "{query}"</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

