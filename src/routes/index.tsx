import { SiteHeader } from "@/components/SiteHeader";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LiveVisitorMap } from "@/components/LiveVisitorMap";
import { StartupFavicon } from "@/components/StartupFavicon";
import { ArrowRight, Settings, LogOut, LayoutDashboard, Eye, MousePointerClick, Globe, BarChart2, Users, TrendingUp, Info, X, Trophy, Gavel, Sparkles } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBidBoard, formatUsd } from "@/lib/bid";

import { SitePreviewSurface } from "@/components/SitePreviewSurface";

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}




export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StartupBar — Free traffic exchange for founders" },
      { name: "description", content: "Add one line of code to your site. A 36px bar shows another founder's startup, and yours appears on theirs. Free traffic exchange." },
      { property: "og:title", content: "StartupBar — Free traffic exchange for founders" },
      { property: "og:description", content: "Add one line of code to your site. A 36px bar shows another founder's startup, and yours appears on theirs. Free traffic exchange." },
      { name: "twitter:title", content: "StartupBar — Free traffic exchange for founders" },
      { name: "twitter:description", content: "Add one line of code to your site. A 36px bar shows another founder's startup, and yours appears on theirs. Free traffic exchange." },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://startupbar.co/" },
      { property: "og:image", content: "https://startupbar.co/__l5e/assets-v1/6ee40991-2265-40aa-8073-c327d29be787/og-social-card.png" },
      { name: "twitter:image", content: "https://startupbar.co/__l5e/assets-v1/6ee40991-2265-40aa-8073-c327d29be787/og-social-card.png" },
    ],
    links: [
      { rel: "canonical", href: "https://startupbar.co/" },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
        href: "https://fonts.gstatic.com/s/instrumentserif/v4/jizDREVItHgc8qDIbSTKq4XIWpJP-6O_YkoUFbrIROe0.woff2",
      },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "name": "StartupBar",
            "url": "https://startupbar.co",
          },
          {
            "@type": "Organization",
            "name": "StartupBar",
            "url": "https://startupbar.co",
            "logo": "https://startupbar.co/favicon.ico",
          },
        ],
      }),
    }],
  }),
  component: Landing,
});

function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logosRef = useRef<{ img: HTMLImageElement; dotIdx: number }[]>([]);

  useEffect(() => {
    supabase.from("startups").select("website_url,logo_url").eq("status", "approved").then(({ data }) => {
      if (!data || data.length === 0) return;
      // Total dots across all rings = 8+12+16+20 = 56. Spread logos evenly
      // across unique dot slots so every approved startup gets its own orbit spot.
      const TOTAL_DOTS = 100;
      const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, TOTAL_DOTS);
      const step = Math.max(1, Math.floor(TOTAL_DOTS / shuffled.length));
      const used = new Set<number>();
      logosRef.current = shuffled.map((s: any, i) => {
        let slot = (i * step) % TOTAL_DOTS;
        while (used.has(slot)) slot = (slot + 1) % TOTAL_DOTS;
        used.add(slot);
        const img = new Image();
        const domain = (s.website_url || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        img.src = s.logo_url || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        return { img, dotIdx: slot };
      });
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const mouse = { x: -999, y: -999, inside: false };
    let dots: { angle: number; speed: number; radius: number; x: number; y: number; r: number; ringIdx: number; dotIdx: number }[] = [];
    const RINGS = [120, 210, 320, 450];

    const init = () => {
      dots = [];
      const cx = canvas.offsetWidth / 2;
      const cy = canvas.offsetHeight * 0.48;
      RINGS.forEach((radius, ri) => {
        const count = 13 + ri * 8;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const speed = (0.0012 + Math.random() * 0.0008) * (Math.random() > 0.5 ? 1 : -1);
          dots.push({ angle, speed, radius, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, r: 1.8 + Math.random() * 1.2, ringIdx: ri, dotIdx: dots.length });
        }
      });
    };

    let lastCssW = 0, lastCssH = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.offsetWidth;
      const cssH = canvas.offsetHeight;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (cssW !== lastCssW || cssH !== lastCssH) {
        lastCssW = cssW; lastCssH = cssH;
        init();
      }
    };

    const draw = () => {
      const cx = canvas.offsetWidth / 2;
      const cy = canvas.offsetHeight * 0.48;
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      RINGS.forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,0,0,0.07)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      dots.forEach((d) => {
        d.angle += d.speed;
        const tx = cx + Math.cos(d.angle) * d.radius;
        const ty = cy + Math.sin(d.angle) * d.radius;
        if (mouse.inside) {
          const dx = mouse.x - tx;
          const dy = mouse.y - ty;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const pull = (1 - dist / 180) * 0.35;
            d.x += (tx + dx * pull - d.x) * 0.1;
            d.y += (ty + dy * pull - d.y) * 0.1;
          } else {
            d.x += (tx - d.x) * 0.1;
            d.y += (ty - d.y) * 0.1;
          }
        } else {
          d.x += (tx - d.x) * 0.1;
          d.y += (ty - d.y) * 0.1;
        }
      });

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          if (dots[i].ringIdx !== dots[j].ringIdx) continue;
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(0,0,0,${(1 - dist / 100) * 0.1})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      if (mouse.inside) {
        dots.forEach((d) => {
          const dx = mouse.x - d.x;
          const dy = mouse.y - d.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(0,0,0,${(1 - dist / 160) * 0.3})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        });
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 70);
        g.addColorStop(0, "rgba(0,0,0,0.05)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 70, 0, Math.PI * 2);
        ctx.fill();
      }

      const logoMap = new Map<number, HTMLImageElement>();
      logosRef.current.forEach(({ img, dotIdx }) => { logoMap.set(dotIdx % dots.length, img); });

      dots.forEach((d) => {
        const logoImg = logoMap.get(d.dotIdx);
        if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
          const lr = 11;
          ctx.save(); ctx.beginPath(); ctx.arc(d.x, d.y, lr, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(logoImg, d.x - lr, d.y - lr, lr * 2, lr * 2); ctx.restore();
          ctx.beginPath(); ctx.arc(d.x, d.y, lr, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 0.8; ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fill();
        }
      });

      animId = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouse.x = x;
      mouse.y = y;
      mouse.inside = x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height;
    };
    const onLeave = () => { mouse.inside = false; };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);

    resize();
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

function SlideVisual1() {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
      <div className="flex h-8 items-center gap-1.5 border-b border-black/6 bg-black/[0.02] px-3">
        <div className="h-2 w-2 rounded-full bg-red-400/70" />
        <div className="h-2 w-2 rounded-full bg-yellow-400/70" />
        <div className="h-2 w-2 rounded-full bg-green-400/70" />
        <div className="ml-2 text-[10px] text-black/25">yoursite.com</div>
      </div>
      <div className="flex h-9 items-center gap-2.5 border-b border-black/10 bg-white px-4">
        <span className="rounded-sm bg-black px-1.5 py-0.5 text-[8px] font-bold tracking-widest text-white">STARTUPBAR</span>
        <span className="text-[12px] font-medium text-black">AISuperMenu</span>
        <span className="truncate text-[11px] text-black/40">— AISuperMenu is a smart digital menu…</span>
        <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] font-medium text-black">Visit ↗</span>
      </div>
      <div className="space-y-2.5 px-5 py-5">
        <div className="h-3 w-2/5 rounded-full bg-black/8" />
        <div className="h-3 w-3/5 rounded-full bg-black/5" />
        <div className="mt-4 h-10 w-full rounded-lg bg-black/4" />
        <div className="flex gap-2 pt-2">
          <div className="h-8 w-20 rounded-md bg-black/10" />
          <div className="h-8 w-24 rounded-md bg-black/5" />
        </div>
      </div>
    </div>
  );
}

function SlideVisual2() {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#111] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)]">
      <div className="flex h-9 items-center justify-between border-b border-white/8 px-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-white/20" />
          <div className="h-2 w-2 rounded-full bg-white/20" />
          <div className="h-2 w-2 rounded-full bg-white/20" />
          <span className="ml-2 text-[11px] text-white/30">index.html</span>
        </div>
        <span className="text-[11px] text-white/20">{`</>`}</span>
      </div>
      <div className="overflow-x-auto px-5 py-5 font-mono text-[11px] sm:text-[13px] leading-7">
        <p className="text-white/30">{`<!-- paste anywhere on your site -->`}</p>
        <p><span className="text-[#7dd3fc]">{`<script`}</span></p>
        <p className="pl-5"><span className="text-white/50">src=</span><span className="text-[#86efac]">"https://startupbar.co</span></p>
        <p className="pl-8"><span className="text-[#86efac]">/widget/loader.js"</span></p>
        <p className="pl-5"><span className="text-white/50">data-startup-id=</span><span className="text-[#fcd34d]">"YOUR_ID"</span></p>
        <p><span className="text-[#7dd3fc]">{`></script>`}</span></p>
      </div>
      <div className="flex items-center justify-between border-t border-white/8 px-4 py-3">
        <span className="text-[11px] text-white/25">Async · zero page-speed impact</span>
        <span className="cursor-pointer text-[11px] text-white/40 hover:text-white/70 transition-colors">Copy ↗</span>
      </div>
    </div>
  );
}

function SlideVisual3() {
  const cards = [
    { Icon: Eye,              title: "Real Impressions",  sub: "Only visible views count" },
    { Icon: MousePointerClick,title: "Click Tracking",    sub: "Know exactly who clicked" },
    { Icon: Globe,            title: "Traffic Analytics", sub: "Country, device, referrer" },
    { Icon: BarChart2,        title: "Network Rank",      sub: "See where you stand" },
    { Icon: Users,            title: "Founder Network",   sub: "Reach startup audiences" },
    { Icon: TrendingUp,       title: "Mutual Growth",     sub: "More founders = more reach" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(({ Icon, title, sub }) => (
        <div key={title} className="group flex flex-col gap-3 rounded-xl border border-black/8 bg-white p-4 transition-all duration-200 hover:border-black/20 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/8 bg-black/[0.03] transition-colors group-hover:bg-black group-hover:border-black">
            <Icon className="h-4 w-4 text-black/50 transition-colors group-hover:text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-black">{title}</p>
            <p className="mt-0.5 text-xs text-black/40">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const STEPS = [
  {
    step: "01",
    headline: "You promote others.\nOthers promote you.",
    bullets: [
      "Embed bar → promotes a verified startup",
      "They embed → your startup gets featured back",
      "Bigger network = more reach for everyone",
    ],
    visual: <SlideVisual1 />,
  },
  {
    step: "02",
    headline: "One line of code.\nInfinite reach.",
    bullets: [
      "Works on Next.js, Webflow, WordPress — anything",
      "Async load — zero impact on page speed",
      "Auto-updated, always shows the best match",
    ],
    visual: <SlideVisual2 />,
  },
  {
    step: "03",
    headline: "Every impression.\nEvery click. Tracked.",
    bullets: [
      "Real impressions — visible in viewport only",
      "Country, device, referrer — all free",
      "Verified traffic badge on your listing",
    ],
    visual: <SlideVisual3 />,
  },
];

function HowItWorks() {
  return (
    <section id="how" className="border-t border-black/8 bg-white px-6 py-14 sm:py-20 md:py-28 overflow-hidden">
      <div className="mx-auto max-w-5xl">
        <p className="mb-12 text-xs font-semibold uppercase tracking-[0.18em] text-black/35">How it works</p>

        <div className="space-y-20 md:space-y-28">
          {STEPS.map((s, i) => (
            <div
              key={s.step}
              className="grid items-start gap-10 md:grid-cols-2 md:gap-16"
            >
              <div className={`min-w-0 md:pt-1 ${i % 2 === 1 ? "md:order-2" : ""}`}>
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-black/25">STEP {s.step}</span>
                
                <h2
                  className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]"
                  style={{ fontFamily: "var(--font-display)", whiteSpace: "pre-line" }}
                >
                  {s.headline}
                </h2>
                <ul className="mt-7 space-y-3">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-[15px] leading-relaxed text-black/55">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/15 text-[11px] text-black/40">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
                {i === STEPS.length - 1 && (
                  <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <Link
                      to="/apply"
                      className="group inline-flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition-all hover:bg-black/80"
                    >
                      Get started free
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center gap-2 rounded-lg border border-black/12 px-5 py-3 text-sm font-medium text-black/60 transition-colors hover:border-black/30 hover:text-black"
                    >
                      View your dashboard
                    </Link>
                  </div>
                )}
              </div>
              <div className={`min-w-0 overflow-hidden ${i % 2 === 1 ? "md:order-1" : ""}`}>{s.visual}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

const FACTS = [
  { stat: "$0", label: "forever", body: "No ad budget, no CPMs, no subscriptions. You trade a 36px bar — nothing else." },
  { stat: "100%", label: "founder audience", body: "Every site in the network is run by a founder. You reach people who actually buy SaaS." },
  { stat: "1 line", label: "of code", body: "No SDK, no onboarding flow, no dashboard to manage. Paste once and forget." },
];

function WhyItWorks() {
  const { ref, visible } = useInView();
  return (
    <section className="border-t border-black/8 bg-black/[0.015] px-6 py-16 sm:py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div
          ref={ref}
          className="transition-all duration-700"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-black/35">Why it works</span>
          <h2
            className="mt-4 text-3xl font-medium leading-tight tracking-tight sm:text-4xl md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The fairest growth channel<br />you'll ever ship.
          </h2>
        </div>
        <div className="mt-16 grid gap-3 md:grid-cols-3 md:gap-0">
          {FACTS.map((f, i) => (
            <FactCell key={i} fact={f} delay={i * 100} total={FACTS.length} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FactCell({ fact, delay, total, index }: { fact: typeof FACTS[0]; delay: number; total: number; index: number }) {
  const { ref, visible } = useInView(0.15);
  return (
    <div
      ref={ref}
      className={`group relative rounded-2xl bg-white px-8 py-10 transition-all duration-700 hover:shadow-[0_4px_24px_-6px_rgba(0,0,0,0.08)] ${index < total - 1 ? "mb-3 md:mb-0 md:mr-3" : ""}`}
      style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)", transitionDelay: `${delay}ms` }}
    >
      <div
        className="text-5xl font-semibold leading-none tracking-tight text-black transition-transform duration-300 group-hover:-translate-y-0.5 md:text-6xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {fact.stat}
      </div>
      <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/35">{fact.label}</div>
      <div className="mt-6 h-px w-8 bg-black/12 transition-all duration-300 group-hover:w-12 group-hover:bg-black/25" />
      <p className="mt-5 text-sm leading-relaxed text-black/45">{fact.body}</p>
    </div>
  );
}

function BarFreeDemo() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_20px_60px_-24px_rgba(0,0,0,0.18)]">
        <div className="flex h-9 items-center gap-1.5 border-b border-black/8 bg-black/[0.02] px-4">
          <div className="h-2 w-2 rounded-full bg-red-400/70" />
          <div className="h-2 w-2 rounded-full bg-yellow-400/70" />
          <div className="h-2 w-2 rounded-full bg-green-400/70" />
          <div className="ml-2 text-[10px] text-black/25">yoursite.com</div>
        </div>
        <div className="relative px-5 py-5">
          <div className="relative h-9">
            {/* The bar, which lifts away and vanishes */}
            <div className="sb-barfree-bar absolute inset-0 flex h-9 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)]">
              <span className="shrink-0 rounded-sm bg-black px-1.5 py-0.5 text-[8px] font-bold tracking-widest text-white">STARTUPBAR</span>
              <div className="h-2 w-16 rounded-full bg-black/8" />
              <div className="hidden h-2 w-20 rounded-full bg-black/5 sm:block" />
              <span className="ml-auto shrink-0 text-[11px] font-medium text-black/50">Visit →</span>
            </div>
            {/* The gold badge that takes its place */}
            <div className="sb-barfree-gold absolute inset-0 flex h-9 items-center justify-center gap-2 rounded-lg border border-amber-400/50 bg-amber-50/90 shadow-[0_2px_12px_-4px_rgba(180,120,0,0.25)]">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[12px] font-semibold tracking-tight text-amber-700">Bar free</span>
              <span className="text-[11px] text-amber-600/60">and still in the network</span>
            </div>
          </div>
          <div className="mt-5 space-y-2.5">
            <div className="h-3 w-2/5 rounded-full bg-black/8" />
            <div className="h-3 w-3/5 rounded-full bg-black/5" />
            <div className="mt-4 h-10 w-full rounded-lg bg-black/4" />
            <div className="flex gap-2 pt-1">
              <div className="h-7 w-16 rounded-md bg-black/10" />
              <div className="h-7 w-20 rounded-md bg-black/5" />
            </div>
          </div>
        </div>
      </div>
ec      </div>
    </div>
  );
}

function BarFreeSection() {
  const { ref, visible } = useInView(0.15);
  return (
    <section
      className="relative overflow-hidden border-t border-black/8 px-6 py-16 sm:py-24"
      style={{ background: "linear-gradient(180deg, oklch(0.985 0.012 85), oklch(0.962 0.028 85))" }}
    >
      <div
        ref={ref}
        className="mx-auto max-w-5xl transition-all duration-700"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
      >
        <div className="flex flex-col items-center gap-12 md:flex-row md:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-white/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">
              <Sparkles className="h-3 w-3" /> New · Go bar free
            </span>
            <h2
              className="mt-5 text-3xl font-medium leading-tight tracking-tight sm:text-4xl md:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Keep your listing.<br />Lose the bar.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-black/50">
              Supporter membership keeps your startup rotating across the network without
              placing the bar on your own site. You keep your profile page, your dashboard,
              and you get the gold highlight reserved for supporters.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                "Your listing still rotates across the network",
                "Gold highlight on the network page and the leaderboard",
                "Full dashboard with impressions, clicks and referrals",
                "An optional invisible analytics code for your visitor map",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-[15px] leading-relaxed text-black/55">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-500/40 text-[11px] text-amber-600">✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/apply"
                className="group inline-flex h-12 items-center rounded-lg bg-black px-7 text-sm font-medium text-white transition-all duration-200 hover:bg-black/80"
              >
                Go bar free
                <Sparkles className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:rotate-12" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg border border-black/12 px-5 py-3 text-sm font-medium text-black/60 transition-colors hover:border-black/30 hover:text-black"
              >
                Already a member? Switch here
              </Link>
            </div>
          </div>
          <div className="w-full max-w-sm shrink-0">
            <BarFreeDemo />
            <p className="mt-4 text-center text-[11px] text-black/30">
              The bar leaves. Your presence in the network stays.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StartupBidSection() {
  const { ref, visible } = useInView(0.15);
  const { data: board } = useBidBoard();
  const top3 = (board ?? []).slice(0, 3);
  return (
    <section className="border-t border-black/8 bg-black px-6 py-16 text-white sm:py-24">
      <div
        ref={ref}
        className="mx-auto max-w-5xl transition-all duration-700"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
      >
        <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
              <Gavel className="h-3 w-3" /> New · StartupBid
            </span>
            <h2
              className="mt-5 text-3xl font-medium leading-tight tracking-tight sm:text-4xl md:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Want the top spot?<br />Bid for it.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-white/50">
              StartupBid is our pay-to-rank leaderboard. Enter any site or @handle, pay from $5, and
              your startup climbs the board. Bids are cumulative, ranking is pure total spend, and
              anyone can join with no account and no widget install required.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/startupbid"
                className="group inline-flex h-12 items-center rounded-lg bg-white px-7 text-sm font-medium text-black transition-all duration-200 hover:bg-white/85"
              >
                See the board
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <span className="text-xs text-white/35">Separate from the free widget network.</span>
            </div>
          </div>
          <div className="w-full max-w-sm space-y-2.5">
            {top3.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6 text-center text-sm text-white/45">
                The board is open. Be the first to claim #1.
              </div>
            ) : (
              top3.map((r) => (
                <Link
                  key={r.id}
                  to="/startupbid"
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.08]"
                >
                  <span className="text-xs font-semibold text-white/40">#{r.rank}</span>
                  <span className="flex-1 truncate text-sm font-medium text-white/85">{r.display_url}</span>
                  <span className="text-sm font-semibold text-white">{formatUsd(r.total_cents)}</span>
                </Link>
              ))
            )}
            <p className="pt-1 text-center text-[11px] text-white/25">Live board updates every few seconds.</p>
          </div>
        </div>
      </div>
    </section>
  );
}


function CtaBanner() {

  const { ref, visible } = useInView(0.2);
  return (
    <section className="border-t border-black/8 bg-white px-6 py-16 sm:py-24 md:py-36">
      <div
        ref={ref}
        className="mx-auto max-w-2xl text-center transition-all duration-700"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(28px)" }}
      >
        <h2
          className="text-3xl font-medium leading-tight tracking-tight text-black sm:text-4xl md:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Start getting discovered<br />by other founders today.
        </h2>
        <p className="mx-auto mt-5 max-w-sm text-[15px] leading-relaxed text-black/40">
          Two minutes to set up. Free forever.<br />Cancel by deleting one line of code.
        </p>
        <div className="mt-10">
          <Link
            to="/apply"
            className="group inline-flex h-12 items-center rounded-lg bg-black px-7 text-sm font-medium text-white transition-all duration-200 hover:bg-black/80"
          >
            Apply your startup
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="h-2 w-6 rounded-sm bg-black" />
      <span className="text-base font-semibold tracking-tight text-black">StartupBar</span>
    </Link>
  );
}




function Landing() {
  // Site visits are tracked at the root for every route now.
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [liveStartups, setLiveStartups] = useState<Array<{ name: string; description: string; website_url: string; logo_url: string | null }>>([]);
  const [liveIndex, setLiveIndex] = useState(0);
  const [liveFade, setLiveFade] = useState(true);
  const [mockInfoOpen, setMockInfoOpen] = useState(false);
  const [mockDismissed, setMockDismissed] = useState(false);
  const [startupBarId, setStartupBarId] = useState<string | null>(null);
  const [startupBarLogo, setStartupBarLogo] = useState<string | null>(null);
  const [siteInput, setSiteInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const liveStartup = liveStartups[liveIndex] ?? null;

  const previewHost = (() => {
    if (!previewUrl) return "yourstartup.com";
    try { return new URL(previewUrl).hostname.replace(/^www\./, ""); } catch { return "yourstartup.com"; }
  })();

  // Live preview: as soon as what's typed looks like a real domain (something
  // after the dot with a plausible TLD), load it. Short debounce so it feels
  // instant; the arrow button stays free for the apply flow.
  useEffect(() => {
    const raw = siteInput.trim().replace(/^@/, "").replace(/\s+/g, "");
    if (!raw) { setPreviewUrl(null); return; }
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let host = "";
    let href = "";
    try {
      const u = new URL(withProto);
      host = u.hostname;
      href = u.toString();
    } catch { return; }
    // Require label(s) + a TLD of at least 2 letters, e.g. "acme.co", "a.b.io".
    if (!/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}$/i.test(host)) return;
    const t = window.setTimeout(() => setPreviewUrl(href), 250);
    return () => window.clearTimeout(t);
  }, [siteInput]);


  async function goApply() {
    const raw = siteInput.trim().replace(/^@/, "");
    // Re-validate with the Auth server rather than trusting cached state,
    // so a stale tab still sends logged-in users straight to /apply.
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      navigate({ to: "/apply", search: raw ? ({ url: raw } as never) : undefined });
      return;
    }
    // Not logged in: remember the site they entered so /apply can pick it
    // up automatically once they sign in, then send them to /auth.
    try {
      sessionStorage.setItem("startupbar:auth-next", "/apply");
      if (raw) sessionStorage.setItem("startupbar:apply-url", raw);
    } catch { /* ignore */ }
    navigate({ to: "/auth" });
  }



  useEffect(() => {
    supabase.from("startups").select("id, logo_url").ilike("website_url", "%startupbar.co%").maybeSingle().then(({ data }) => {
      if (data?.id) setStartupBarId(data.id);
      if (data?.logo_url) setStartupBarLogo(data.logo_url);
    });
  }, []);

  useEffect(() => {
    supabase.from("startups").select("name, description, website_url, logo_url").eq("status", "approved").then(({ data }) => {
      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setLiveStartups(shuffled);
      }
    });
  }, []);

  useEffect(() => {
    if (liveStartups.length <= 1) return;
    let swap: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      setLiveFade(false);
      swap = setTimeout(() => {
        setLiveIndex(i => (i + 1) % liveStartups.length);
        setLiveFade(true);
      }, 400);
    }, 3600);
    return () => { clearInterval(id); clearTimeout(swap); };
  }, [liveStartups.length]);

  useEffect(() => {
    // getSession() reads from localStorage first, so it resolves synchronously
    // when a cached session exists — avoids the header-flash on refresh.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser({
          email: data.session.user.email,
          name: data.session.user.user_metadata?.full_name?.split(" ")[0] ?? "",
        });
      }
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email,
          name: session.user.user_metadata?.full_name?.split(" ")[0] ?? "",
        });
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-dvh bg-white text-black">
      {/* HEADER */}
      <SiteHeader />


      <main>
      {/* HERO */}

      <section className="relative overflow-hidden bg-white">
        <HeroCanvas />
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-10 pb-12 text-center sb-fade-up sm:px-6 sm:pt-20 sm:pb-28">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-black/30">
            Free forever&nbsp;&nbsp;·&nbsp;&nbsp;No money, ever
          </p>

          <h1
            className="mt-6 text-[1.9rem] font-medium leading-[1.08] tracking-tight text-black sm:mt-8 sm:text-5xl md:text-7xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Founders helping founders
            <br className="hidden sm:block" />{" "}
            get their <em className="italic">first</em> traffic.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base text-black/50 leading-relaxed sm:mt-7 sm:text-lg">
            Add one line of code. A small bar appears on your site showing another founder's startup. In return, yours gets shown on theirs.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-1.5">
            <div className="flex w-full max-w-md items-center gap-2 rounded-full border-2 border-black bg-white p-1.5 pl-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-shadow focus-within:shadow-[0_0_0_4px_rgba(0,0,0,0.06)]">
              <div className="h-2.5 w-8 shrink-0 rounded-sm bg-black" />
              <input
                value={siteInput}
                onChange={(e) => setSiteInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") goApply(); }}
                placeholder="yoursite.com"
                aria-label="Your website"
                className="min-w-0 flex-1 bg-transparent py-2 text-[15px] tracking-tight text-black outline-none placeholder:text-black/30"
              />
              <button
                onClick={goApply}
                aria-label="Continue to apply with your site"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white transition-opacity hover:opacity-85"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[12px] text-black/35">
              {previewUrl ? "This is how the bar looks on your site." : "Enter your site to add it to the network."}
            </p>
          </div>

          {/* Browser mock */}
          <div className="relative mx-auto mt-4 sm:mt-6 max-w-3xl">

            {/* Handwritten annotation pointing at the widget bar */}
            {!mockDismissed && (
              <div
                aria-hidden
                className="pointer-events-none absolute right-5 top-[54px] z-10 flex items-start gap-1.5 sm:right-8 sm:top-[62px] sm:gap-2 md:right-6 md:top-[62px]"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                <svg viewBox="0 0 70 90" fill="none" className="h-16 w-12 shrink-0 sm:h-20 sm:w-14 md:h-[88px] md:w-[68px]">
                  <path
                    d="M55 82 C 40 70, 22 55, 16 34 C 12 22, 14 12, 20 4"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M20 4 L 12 10 M 20 4 L 26 12"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="mt-5 -rotate-2 whitespace-nowrap text-[17px] leading-[1.05] text-neutral-800 sm:mt-8 sm:text-[22px] md:mt-9 md:text-[24px]">
                  <div>The StartupBar widget <span className="text-amber-500" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>✦</span></div>
                  <div className="text-[13px] text-neutral-500 sm:text-[17px] md:text-[19px]">(this is how it looks on your site)</div>
                </div>
              </div>
            )}
            <div className="relative overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)]">
              <div className="flex h-9 items-center gap-2 border-b border-black/8 bg-black/[0.02] px-4">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                <div className="ml-3 truncate text-[11px] text-black/30">{previewHost}</div>
              </div>
              {!mockDismissed && (
                <div className="relative border-b border-black/8">
                  <div className="relative flex h-9 items-center gap-0 bg-white px-2 text-[13px]" style={{ color: "#0f172a" }}>
                    <button
                      onClick={() => setMockInfoOpen(v => !v)}
                      aria-label="What is this?"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-black/30 transition-colors hover:text-black/60"
                    >
                      <Info size={12} />
                    </button>
                    <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
                      <span className="shrink-0 rounded-sm bg-black px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">STARTUPBAR</span>
                      <div
                        className="flex min-w-0 flex-1 items-center gap-2"
                        style={{ opacity: liveFade ? 1 : 0, transition: "opacity 400ms ease-in-out" }}
                      >
                        <StartupFavicon
                          url={liveStartup?.website_url ?? "acme.ai"}
                          name={liveStartup?.name ?? "Acme AI"}
                          logoUrl={liveStartup?.logo_url ?? null}
                          size={14}
                          className="shrink-0 rounded-sm"
                        />
                        <span className="max-w-[160px] shrink-0 truncate font-medium">{liveStartup?.name ?? "Acme AI"}</span>
                        <span className="hidden min-w-0 flex-1 truncate text-black/40 sm:block">
                          {liveStartup ? `· ${liveStartup.description}` : "· turn meeting notes into action items, automatically"}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 px-2 text-[12px] text-black/60 hover:underline underline-offset-2 cursor-pointer">Visit →</span>
                    <button
                      onClick={() => setMockDismissed(true)}
                      aria-label="Dismiss"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-black/25 transition-colors hover:text-black/50"
                    >
                      <X size={11} />
                    </button>
                  </div>
                  {mockInfoOpen && (
                    <div className="absolute left-0 right-0 top-full z-20 border-t border-black/6 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)]">
                      <p className="text-[11px] font-semibold text-black/70">Founder-to-founder growth</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-black/45">
                        This bar shows startups from the <strong className="text-black/60">StartupBar</strong> network — founders who display each other's startups for free, mutual traffic. Zero cost, no ads.
                      </p>
                      <span className="mt-2 inline-block text-[11px] font-semibold text-black/60 hover:underline underline-offset-2 cursor-pointer">
                        Have a startup? Join free →
                      </span>
                    </div>
                  )}
                </div>
              )}
              {/* Fixed viewport height in both states so the hero (and the
                  orbiting logos above it) never shifts when a site is typed. */}
              <div className="h-[320px] w-full sm:h-[420px]">
                {previewUrl ? (
                  <SitePreviewSurface url={previewUrl} />
                ) : (
                  <div className="flex h-full flex-col justify-center bg-black/[0.02] px-6 py-8 sm:px-10">
                    <div className="mx-auto w-full max-w-xl space-y-3">
                      <div className="h-4 w-1/3 rounded bg-black/[0.07]" />
                      <div className="h-3 w-1/2 rounded bg-black/[0.05]" />
                      <div className="h-3 w-5/12 rounded bg-black/[0.05]" />
                    </div>
                    <div className="mx-auto mt-8 grid w-full max-w-xl grid-cols-3 gap-3 sm:mt-12 sm:gap-4">
                      <div className="h-16 rounded-lg bg-black/[0.05] sm:h-20" />
                      <div className="h-16 rounded-lg bg-black/[0.04] sm:h-20" />
                      <div className="h-16 rounded-lg bg-black/[0.05] sm:h-20" />
                    </div>
                  </div>
                )}
              </div>


            </div>
          </div>
        </div>
      </section>

      <HowItWorks />

      {/* Live Network Map */}
      <section className="border-t border-black/8 px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-black/35">Live network</span>
          <h2
            className="mt-4 text-3xl font-medium leading-tight tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Track where your visitors<br className="hidden sm:block" /> come from. In real time.
          </h2>
          <p className="mt-4 text-base text-black/45 max-w-xl">
            Every founder in the network shares their traffic. Watch the world light up as visitors discover startups like yours.
          </p>
          <div className="mt-10">
            <LiveVisitorMap networkMode title="Live network activity" startupName="StartupBar" startupLogoUrl={startupBarLogo ?? undefined} />
          </div>
        </div>
      </section>

      <WhyItWorks />
      <BarFreeSection />
      <StartupBidSection />

      <CtaBanner />
      </main>

      {/* FOOTER */}
      <footer className="border-t border-black/8 bg-white px-6 py-10">

        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <Logo />
              <span className="text-[11px] text-black/30">Built for founders, by founders.</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-black/40">
              <a href="mailto:hello@startupbar.co" className="hover:text-black transition-colors">Support</a>
              {authReady && user ? (
                <Link to="/dashboard" className="hover:text-black transition-colors">Dashboard</Link>
              ) : (
                <Link to="/auth" className="hover:text-black transition-colors">Sign in</Link>
              )}
              <Link to="/apply" className="hover:text-black transition-colors">Apply</Link>
              <Link to="/pricing" className="hover:text-black transition-colors">Pricing</Link>
              <Link to="/faq" className="hover:text-black transition-colors">FAQ</Link>
              <Link to="/startupbid" className="hover:text-black transition-colors">StartupBid</Link>

              <Link to="/privacy" className="hover:text-black transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-black transition-colors">Terms</Link>
              <a
                href="https://x.com/danielabinav16"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="hover:text-black transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <span className="text-black/20">© {new Date().getFullYear()} StartupBar</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
