import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { WelcomeSections } from "@/components/WelcomeSections";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { StartupFavicon } from "@/components/StartupFavicon";
import { ArrowRight, ArrowUpRight, Check, Info, RotateCcw, X } from "lucide-react";
import { useRef, useEffect, useState, useMemo, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { SitePreviewSurface } from "@/components/SitePreviewSurface";
import { resolveEmbedUrl } from "@/lib/preview-probe.functions";
import { resolveWidgetPalette, widgetMutedColor } from "@/lib/widget-palette";
import { assignHeroOrbits } from "@/lib/hero-orbits";
import { startupLogoSources } from "@/lib/startup-logo-sources";
import claudeIcon from "@/assets/claude-ai-icon.png.asset.json";
import { CLAUDE_CONNECTOR_URL } from "@/components/McpAnnouncement";

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
            "logo": "https://startupbar.co/favicon.png",
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
    let cancelled = false;
    supabase.from("startups").select("website_url,logo_url").eq("status", "approved").then(({ data }) => {
      if (cancelled || !data || data.length === 0) return;
      logosRef.current = data.map((s, i) => {
        const img = new Image();
        const sources = startupLogoSources(s.website_url || "", s.logo_url);
        let sourceIndex = 0;
        img.onerror = () => {
          const next = sources[++sourceIndex];
          if (!cancelled && next) img.src = next;
          else img.onerror = null;
        };
        const first = sources[0];
        if (first) img.src = first;
        return { img, dotIdx: i };
      });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const mouse = { x: -999, y: -999, inside: false };
    let dots: { angle: number; speed: number; radius: number; x: number; y: number; r: number; ringIdx: number; dotIdx: number }[] = [];
    let RINGS = [190, 290, 390, 490];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const colors = getComputedStyle(canvas);
    const orbitInk = colors.getPropertyValue("--hero-orbit-ink").trim();
    const orbitEdge = colors.getPropertyValue("--hero-orbit-edge").trim();

    const init = () => {
      dots = [];
      const cx = canvas.offsetWidth / 2;
      const cy = canvas.offsetHeight * 0.52;
      dots = assignHeroOrbits(logosRef.current.length).map(({ index, ring, angle }) => {
        const radius = RINGS[ring];
        return { angle, speed: (ring % 2 === 0 ? 1 : -1) * .0008, radius, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, r: 2, ringIdx: ring, dotIdx: index };
      });
    };

    let lastCssW = 0, lastCssH = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.offsetWidth;
      const cssH = canvas.offsetHeight;
      const base = Math.min(cssW * .46, cssH * .45, 490);
      RINGS = [.39, .59, .8, 1].map(scale => base * scale);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (cssW !== lastCssW || cssH !== lastCssH) {
        lastCssW = cssW; lastCssH = cssH;
        init();
      }
    };

    const draw = () => {
      if (dots.length !== logosRef.current.length) init();
      const cx = canvas.offsetWidth / 2;
      const cy = canvas.offsetHeight * 0.52;
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      RINGS.forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = orbitEdge;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      dots.forEach((d) => {
        if (!reducedMotion.matches && !document.hidden) d.angle += d.speed * .6;
        const tx = cx + Math.cos(d.angle) * d.radius;
        const ty = cy + Math.sin(d.angle) * d.radius;
        d.x = tx;
        d.y = ty;
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
            ctx.strokeStyle = orbitInk;
            ctx.globalAlpha = (1 - dist / 100) * .1;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
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
            ctx.strokeStyle = orbitInk;
            ctx.globalAlpha = (1 - dist / 160) * .3;
            ctx.lineWidth = 0.6;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        });

      }

      const logoMap = new Map<number, HTMLImageElement>();
      logosRef.current.forEach(({ img, dotIdx }) => { logoMap.set(dotIdx, img); });

      dots.forEach((d) => {
        const logoImg = logoMap.get(d.dotIdx);
        if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
          const lr = canvas.offsetWidth < 640 ? 9 : 14;
          ctx.save(); ctx.beginPath(); ctx.arc(d.x, d.y, lr, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(logoImg, d.x - lr, d.y - lr, lr * 2, lr * 2); ctx.restore();
          ctx.beginPath(); ctx.arc(d.x, d.y, lr, 0, Math.PI * 2);
          ctx.strokeStyle = orbitEdge; ctx.lineWidth = 0.8; ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = orbitInk;
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
      mouse.inside = !reducedMotion.matches && x >= 0 && x <= canvas.offsetWidth && y >= 0 && y <= canvas.offsetHeight;
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

  return <canvas ref={canvasRef} className="hero-orbit-canvas" aria-hidden="true" />;
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

      <section className="startup-hero">
        <HeroCanvas />
        <div className="startup-hero-inner">
          <div className="hero-copy">
            <span className="hero-eyebrow"><span className="hero-status-dot" /> INDEPENDENT FOUNDERS. SHARED DISCOVERY.</span>
            <h1>Founders helping founders<br />get their <em>first</em> traffic.</h1>
            <p>A little bar on your site. Your startup on theirs.<br className="hero-desktop-break" /> <strong>StartupBar</strong> turns a small space into a shared growth channel.</p>
            <div className="hero-entry">
              <div className="hero-url-input"><span className="hero-brand-capsule" /><input value={siteInput} onChange={e => setSiteInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void goApply(); }} placeholder="Your startup’s website" aria-label="Your website" /><Button onClick={() => void goApply()} aria-label="Continue to apply with your site" className="hero-submit" size="icon"><ArrowRight /></Button></div>
              <div className="hero-entry-notes"><span><Check /> First listing free forever</span><span>No card required</span></div>
              <a href={CLAUDE_CONNECTOR_URL} target="_blank" rel="noopener noreferrer" className="hero-claude-link"><img src={claudeIcon.url} alt="Claude" width={18} height={18} /><span>Add to Claude</span><small>Official connector — manage your startups in chat</small><ArrowUpRight /></a>
              <Link to="/docs/mcp" className="hero-claude-guide">MCP setup guide</Link>
            </div>
          </div>
          <div className="hero-preview-area">
            <div className="hero-preview-heading"><span><span className="hero-status-dot" /> {previewUrl ? "YOUR WEBSITE, IN THE NETWORK" : "SMALL BAR. BIG POSSIBILITIES."}</span><span>36px is all it takes <ArrowRight /></span></div>
            <div className={`mock-blend ${previewUrl ? "" : `mock-blend-${blendIndex}`} hero-browser`} style={previewPaletteStyle}>
              <div className="hero-browser-chrome"><span className="hero-window-dots"><i /><i /><i /></span><span>{previewHost}</span><span className="hero-browser-secure"><Check /> Connected</span></div>
              {!mockDismissed && <div className="hero-widget-wrapper">
                <div className="hero-widget mock-blend-surface">
                  <Button variant="ghost" size="icon" aria-label="What is this?" className="hero-widget-icon" onClick={() => setMockInfoOpen(v => !v)}><Info /></Button>
                  <span className="hero-widget-brand">STARTUPBAR</span>
                  <div className={`hero-widget-startup ${liveFade ? "" : "is-switching"}`}><StartupFavicon url={liveStartup?.website_url ?? "startupbar.co"} name={liveStartup?.name ?? "StartupBar"} logoUrl={liveStartup?.logo_url ?? null} size={18} /><strong>{liveStartup?.name ?? "StartupBar"}</strong><span>{liveStartup?.description ?? "Founders helping founders get discovered."}</span></div>
                  {liveStartup ? <a href={liveStartup.website_url} target="_blank" rel="noopener noreferrer" className="hero-widget-visit">Visit <ArrowUpRight /></a> : <Link to="/network" className="hero-widget-visit">Visit <ArrowUpRight /></Link>}
                  <Button variant="ghost" size="icon" aria-label="Dismiss" className="hero-widget-icon" onClick={() => setMockDismissed(true)}><X /></Button>
                </div>
                {mockInfoOpen && <div className="hero-widget-info"><strong>A little introduction to another founder.</strong><p>Founders in StartupBar display each other’s startups. Add the bar to your site, and your startup can be discovered on theirs.</p><Button variant="link" asChild><Link to="/apply">Join the network <ArrowRight /></Link></Button></div>}
              </div>}
              <div className="hero-site-viewport">
                {!mockDismissed && <div className="hero-widget-annotation" aria-hidden="true"><svg viewBox="0 0 70 90" fill="none"><path d="M55 82 C40 70 22 55 16 34 C12 22 14 12 20 4 M20 4 L12 10 M20 4 L26 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" /></svg><div><span>The StartupBar widget <span className="hero-annotation-star">✦</span></span><small>(this is how it looks on your site)</small></div></div>}
                {previewUrl ? <SitePreviewSurface url={previewUrl} /> : <div className="hero-demo-site mock-blend-surface"><div className="hero-demo-nav"><span><span className="hero-demo-logo" /> Your startup</span><span>Built with ambition <ArrowUpRight /></span></div><div className="hero-demo-content"><span>INDEPENDENTLY BUILT. READY FOR THE WORLD.</span><h2>Your next big thing.<br />Meet your next visitor.</h2><p>You focus on the product.<br />The network opens a new door.</p><div className="hero-demo-progress" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div><div className="hero-demo-bottom"><span><span className="hero-status-dot" /> A little room for discovery</span><span>Keep building. Keep growing. <ArrowUpRight /></span></div></div>}
              </div>
            </div>
            <div className="hero-preview-bottom"><span><Check /> Matches your site’s colors</span><div>{mockDismissed ? <Button variant="ghost" size="sm" onClick={() => setMockDismissed(false)}><RotateCcw /> Restore bar</Button> : <><span className="hero-theme-label">{previewUrl ? "Your site palette" : "A fit for every website"}</span>{!previewUrl && <div className="hero-theme-swatches" aria-label="Preview website colors">{["Light", "Dark", "Blue", "Green", "Coral"].map((name, i) => <Button key={name} variant="ghost" size="icon" className={`hero-theme-swatch hero-theme-${i}`} aria-label={`Preview ${name.toLowerCase()} theme`} aria-pressed={blendIndex === i} title={name} onClick={() => setBlendIndex(i)} />)}</div>}</>}</div></div>
          </div>
          <a href="#how" className="hero-discover-link">A little space. A whole new audience. <ArrowRight /></a>
        </div>
      </section>

      <WelcomeSections startups={liveStartups} logo={startupBarLogo ?? undefined} />
      </main>
    </div>
  );
}
