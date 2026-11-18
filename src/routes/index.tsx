import { SiteHeader } from "@/components/SiteHeader";
import { WelcomeSections } from "@/components/WelcomeSections";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { StartupFavicon } from "@/components/StartupFavicon";
import { ArrowRight, Info, X } from "lucide-react";
import { useRef, useEffect, useState, useMemo, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { SitePreviewSurface } from "@/components/SitePreviewSurface";
import { resolveEmbedUrl } from "@/lib/preview-probe.functions";
import { resolveWidgetPalette, widgetMutedColor } from "@/lib/widget-palette";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { title: "StartupBar — Free traffic exchange for founders" },
      { name: "description", content: "Add one line of code to your site. A 36px bar shows another founder's startup, and yours appears on theirs. Free traffic exchange." },
      { property: "og:title", content: "StartupBar — Free traffic exchange for founders" },
      { property: "og:description", content: "Add one line of code to your site. A 36px bar shows another founder's startup, and yours appears on theirs. Free traffic exchange." },
      { name: "twitter:title", content: "StartupBar — Free traffic exchange for founders" },
      { name: "twitter:description", content: "Add one line of code to your site. A 36px bar shows another founder's startup, and yours appears on theirs. Free traffic exchange." },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://startupbar.co/" },
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
  const [blendIndex, setBlendIndex] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setBlendIndex(i => (i + 1) % 5), 3200);
    return () => window.clearInterval(t);
  }, []);
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



  const previewProbe = useQuery({
    queryKey: ["embed-probe-colors-v2", previewUrl],
    queryFn: () => {
      if (!previewUrl) throw new Error("A preview URL is required");
      return resolveEmbedUrl({ data: { url: previewUrl } });
    },
    enabled: !!previewUrl,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const previewPaletteStyle = useMemo(() => {
    if (!previewUrl) return undefined;
    const p = resolveWidgetPalette(previewProbe.data?.bg, previewProbe.data?.fg);
    if (!p) return undefined;
    return { "--mock-bg": p.background, "--mock-fg": p.foreground, "--mock-muted": widgetMutedColor(p) } as CSSProperties;
  }, [previewUrl, previewProbe.data]);

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
            First listing free forever&nbsp;&nbsp;·&nbsp;&nbsp;Optional paid upgrades
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
            <strong className="font-semibold text-black">StartupBar</strong> is a mutual traffic exchange for indie founders. Add one line of code. A small bar appears on your site showing another founder's startup. In return, yours gets shown on theirs.
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
          <div className={`mock-blend ${previewUrl ? "" : `mock-blend-${blendIndex}`} relative mx-auto mt-4 sm:mt-6 max-w-3xl`} style={previewPaletteStyle}>

            {/* Handwritten annotation pointing at the widget bar */}
            {!mockDismissed && (
              <div
                aria-hidden
                className="pointer-events-none absolute right-5 top-[54px] z-10 flex items-start gap-1.5 sm:right-8 sm:top-[62px] sm:gap-2 md:right-6 md:top-[62px]"
                style={{ fontFamily: "'Caveat', cursive", color: "var(--mock-fg)" }}
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
                <div className={`mt-5 -rotate-2 whitespace-nowrap mock-blend-surface text-[17px] leading-[1.05] sm:mt-8 sm:text-[22px] md:mt-9 md:text-[24px] ${previewUrl ? "rounded-lg px-2 py-1 shadow-sm" : ""}`} style={previewUrl ? { background: "var(--mock-bg)" } : undefined}>
                  <div>The StartupBar widget <span className="text-amber-500" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>✦</span></div>
                  <div className="text-[13px] opacity-70 sm:text-[17px] md:text-[19px]">(this is how it looks on your site)</div>
                </div>
              </div>
            )}
            {!mockDismissed && (
              <div
                aria-hidden
                className="pointer-events-none absolute left-4 top-[84px] z-10 flex items-start gap-1.5 sm:left-8 sm:top-[90px] sm:gap-2"
                style={{ fontFamily: "'Caveat', cursive", color: "var(--mock-fg)" }}
              >
                <svg viewBox="0 0 60 60" fill="none" className="h-10 w-10 shrink-0 sm:h-14 sm:w-14 mock-blend-surface">
                  <path d="M50 52 C 30 48, 14 34, 12 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  <path d="M12 6 L 5 14 M 12 6 L 19 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
                <div className={`mt-6 rotate-1 text-[16px] leading-[1.05] sm:mt-9 sm:text-[21px] mock-blend-surface ${previewUrl ? "rounded-lg px-2 py-1 shadow-sm" : ""}`} style={previewUrl ? { background: "var(--mock-bg)" } : undefined}>
                  <div>Auto-blends with your site's colors</div>
                  <div className="text-[13px] opacity-70 sm:text-[17px]">(matches your background &amp; text color)</div>
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
                  <div className="mock-blend-surface relative flex h-9 items-center gap-0 px-2 text-[13px]" style={{ background: "var(--mock-bg)", color: "var(--mock-fg)" }}>
                    <button
                      onClick={() => setMockInfoOpen(v => !v)}
                      aria-label="What is this?"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-50 transition-opacity hover:opacity-80"
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
                        <span className="hidden min-w-0 flex-1 truncate sm:block" style={{ color: "var(--mock-muted)" }}>
                          {liveStartup ? `· ${liveStartup.description}` : "· turn meeting notes into action items, automatically"}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-[12px] hover:underline underline-offset-2 cursor-pointer">Visit →</span>
                    <button
                      onClick={() => setMockDismissed(true)}
                      aria-label="Dismiss"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-40 transition-opacity hover:opacity-70"
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
                  <div className="mock-blend-surface flex h-full flex-col justify-end px-6 pb-8 sm:px-10 sm:pb-12" style={{ background: "var(--mock-page)" }}>
                    <div className="mx-auto w-full max-w-xl space-y-3">
                      <div className="mock-blend-surface h-4 w-1/3 rounded" style={{ background: "var(--mock-skel)" }} />
                      <div className="mock-blend-surface h-3 w-1/2 rounded" style={{ background: "var(--mock-skel)" }} />
                      <div className="mock-blend-surface h-3 w-5/12 rounded" style={{ background: "var(--mock-skel)" }} />
                    </div>
                    <div className="mx-auto mt-6 grid w-full max-w-xl grid-cols-3 gap-3 sm:mt-8 sm:gap-4">
                      <div className="mock-blend-surface h-16 rounded-lg sm:h-20" style={{ background: "var(--mock-skel)" }} />
                      <div className="mock-blend-surface h-16 rounded-lg sm:h-20" style={{ background: "var(--mock-skel)" }} />
                      <div className="mock-blend-surface h-16 rounded-lg sm:h-20" style={{ background: "var(--mock-skel)" }} />
                    </div>
                  </div>
                )}
              </div>


            </div>
          </div>
        </div>
      </section>

      <WelcomeSections startups={liveStartups} logo={startupBarLogo ?? undefined} />
      </main>
    </div>
  );
}
