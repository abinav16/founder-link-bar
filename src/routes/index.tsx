import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Settings, LogOut, LayoutDashboard, Eye, MousePointerClick, Globe, BarChart2, Users, TrendingUp } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      { name: "description", content: "Add one line of code to your site. A 36px bar shows another founder's startup. In return, your startup gets shown on theirs. Free." },
    ],
  }),
  component: Landing,
});

interface Dot {
  angle: number;
  speed: number;
  radius: number;
  x: number;
  y: number;
  r: number;
  ringIdx: number;
  dotIdx: number;
}

function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logosRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    supabase.from("startups").select("website_url").eq("status", "approved").then(({ data }) => {
      if (!data || data.length === 0) return;
      data.forEach((s, i) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = `https://www.google.com/s2/favicons?domain=${s.website_url}&sz=32`;
        logosRef.current[i] = img;
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
    let dots: Dot[] = [];
    const RINGS = [120, 210, 320, 450];

    const init = () => {
      dots = [];
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.48;
      RINGS.forEach((radius, ri) => {
        const count = 8 + ri * 4;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const speed = (0.00025 + Math.random() * 0.00015) * (Math.random() > 0.5 ? 1 : -1);
          dots.push({ angle, speed, radius, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, r: 9 + Math.random() * 3, ringIdx: ri, dotIdx: dots.length });
        }
      });
    };

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; init(); };

    const draw = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.48;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      RINGS.forEach((r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = "rgba(0,0,0,0.07)"; ctx.lineWidth = 1; ctx.stroke(); });
      dots.forEach((d) => {
        d.angle += d.speed;
        const tx = cx + Math.cos(d.angle) * d.radius;
        const ty = cy + Math.sin(d.angle) * d.radius;
        if (mouse.inside) {
          const dx = mouse.x - tx; const dy = mouse.y - ty; const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) { const pull = (1 - dist / 180) * 0.35; d.x += (tx + dx * pull - d.x) * 0.1; d.y += (ty + dy * pull - d.y) * 0.1; }
          else { d.x += (tx - d.x) * 0.1; d.y += (ty - d.y) * 0.1; }
        } else { d.x += (tx - d.x) * 0.1; d.y += (ty - d.y) * 0.1; }
      });
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          if (dots[i].ringIdx !== dots[j].ringIdx) continue;
          const dx = dots[i].x - dots[j].x; const dy = dots[i].y - dots[j].y; const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) { ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.strokeStyle = `rgba(0,0,0,${(1 - dist / 100) * 0.1})`; ctx.lineWidth = 0.5; ctx.stroke(); }
        }
      }
      if (mouse.inside) {
        dots.forEach((d) => {
          const dx = mouse.x - d.x; const dy = mouse.y - d.y; const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) { ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(mouse.x, mouse.y); ctx.strokeStyle = `rgba(0,0,0,${(1 - dist / 160) * 0.3})`; ctx.lineWidth = 0.6; ctx.stroke(); }
        });
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 70);
        g.addColorStop(0, "rgba(0,0,0,0.05)"); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 70, 0, Math.PI * 2); ctx.fill();
      }
      dots.forEach((d) => {
        const n = logosRef.current.length;
        const img = n > 0 ? logosRef.current[d.dotIdx % n] : null;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
          ctx.restore();
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0,0,0,0.10)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.fill();
        }
      });
      animId = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => { const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; mouse.x = x; mouse.y = y; mouse.inside = x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height; };
    const onLeave = () => { mouse.inside = false; };
    window.addEventListener("resize", resize); window.addEventListener("mousemove", onMove); document.addEventListener("mouseleave", onLeave);
    resize(); draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", onMove); document.removeEventListener("mouseleave", onLeave); };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

function SlideVisual1() {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
      <div className="flex h-8 items-center gap-1.5 border-b border-black/6 bg-black/[0.02] px-3">
        <div className="h-2 w-2 rounded-full bg-red-400/70" /><div className="h-2 w-2 rounded-full bg-yellow-400/70" /><div className="h-2 w-2 rounded-full bg-green-400/70" />
        <div className="ml-2 text-[10px] text-black/25">yoursite.com</div>
      </div>
      <div className="flex h-9 items-center gap-2.5 border-b border-black/10 bg-white px-4">
        <span className="rounded-sm bg-black px-1.5 py-0.5 text-[8px] font-bold tracking-widest text-white">STARTUPBAR</span>
        <span className="text-[12px] font-medium text-black">AISuperMenu</span>
        <span className="truncate text-[11px] text-black/40">— AISuperMenu is a smart digital menu…</span>
        <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] font-medium text-black">Visit ↗</span>
      </div>
      <div className="space-y-2.5 px-5 py-5">
        <div className="h-3 w-2/5 rounded-full bg-black/8" /><div className="h-3 w-3/5 rounded-full bg-black/5" />
        <div className="mt-4 h-10 w-full rounded-lg bg-black/4" />
        <div className="flex gap-2 pt-2"><div className="h-8 w-20 rounded-md bg-black/10" /><div className="h-8 w-24 rounded-md bg-black/5" /></div>
      </div>
    </div>
  );
}

function SlideVisual2() {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#111] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)]">
      <div className="flex h-9 items-center justify-between border-b border-white/8 px-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-white/20" /><div className="h-2 w-2 rounded-full bg-white/20" /><div className="h-2 w-2 rounded-full bg-white/20" />
          <span className="ml-2 text-[11px] text-white/30">index.html</span>
        </div>
        <span className="text-[11px] text-white/20">{`</>`}</span>
      </div>
      <div className="px-5 py-5 font-mono text-[13px] leading-7">
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
    { Icon: Eye, title: "Real Impressions", sub: "Only visible views count" },
    { Icon: MousePointerClick, title: "Click Tracking", sub: "Know exactly who clicked" },
    { Icon: Globe, title: "Traffic Analytics", sub: "Country, device, referrer" },
    { Icon: BarChart2, title: "Network Rank", sub: "See where you stand" },
    { Icon: Users, title: "Founder Network", sub: "Reach startup audiences" },
    { Icon: TrendingUp, title: "Mutual Growth", sub: "More founders = more reach" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(({ Icon, title, sub }) => (
        <div key={title} className="group flex flex-col gap-3 rounded-xl border border-black/8 bg-white p-4 transition-all duration-200 hover:border-black/20 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/8 bg-black/[0.03] transition-colors group-hover:bg-black group-hover:border-black">
            <Icon className="h-4 w-4 text-black/50 transition-colors group-hover:text-white" />
          </div>
          <div><p className="text-sm font-semibold text-black">{title}</p><p className="mt-0.5 text-xs text-black/40">{sub}</p></div>
        </div>
      ))}
    </div>
  );
}

const SLIDES = [
  { headline: "You promote others.\nOthers promote you.", bullets: ["Embed bar → promotes a verified startup", "They embed → your startup gets featured back", "Bigger network = more reach for everyone"], cta: { label: "Get started free", to: "/apply" }, visual: <SlideVisual1 /> },
  { headline: "One line of code.\nInfinite reach.", bullets: ["Works on Next.js, Webflow, WordPress — anything", "Async load — zero impact on page speed", "Auto-updated, always shows the best match"], cta: { label: "Get your embed code", to: "/apply" }, visual: <SlideVisual2 /> },
  { headline: "Every impression.\nEvery click. Tracked.", bullets: ["Real impressions — visible in viewport only", "Country, device, referrer — all free", "Verified traffic badge on your listing"], cta: { label: "View your dashboard", to: "/dashboard" }, visual: <SlideVisual3 /> },
];

function HowItWorks() {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function goTo(i: number) {
    if (i === active || animating) return;
    setAnimating(true);
    setTimeout(() => { setActive(i); setAnimating(false); }, 220);
  }

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setAnimating(true);
      setTimeout(() => { setActive((prev) => (prev + 1) % SLIDES.length); setAnimating(false); }, 220);
    }, 4000);
  }

  useEffect(() => { resetTimer(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  function handleDotClick(i: number) { goTo(i); resetTimer(); }

  const slide = SLIDES[active];

  return (
    <section id="how" className="border-t border-black/8 bg-white px-6 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <p className="mb-12 text-xs font-semibold uppercase tracking-[0.18em] text-black/35">How it works</p>
        <div className="grid items-center gap-12 transition-all duration-300 md:grid-cols-2 md:gap-20" style={{ opacity: animating ? 0 : 1, transform: animating ? "translateY(8px)" : "none" }}>
          <div>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl" style={{ fontFamily: "var(--font-display)", whiteSpace: "pre-line" }}>{slide.headline}</h2>
            <ul className="mt-8 space-y-3">
              {slide.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[15px] leading-relaxed text-black/55">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/15 text-[11px] text-black/40">✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <Link to={slide.cta.to} className="group mt-10 inline-flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-black/80 transition-all">
              {slide.cta.label}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div>{slide.visual}</div>
        </div>
        <div className="mt-12 flex items-center justify-center gap-2.5">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => handleDotClick(i)} className={`rounded-full transition-all duration-300 ${i === active ? "h-2.5 w-8 bg-black" : "h-2.5 w-2.5 bg-black/20 hover:bg-black/40"}`} />
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
    <section className="border-t border-black/8 bg-black/[0.015] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div ref={ref} className="transition-all duration-700" style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-black/35">Why it works</span>
          <h2 className="mt-4 text-4xl font-medium leading-tight tracking-tight md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>The fairest growth channel<br />you'll ever ship.</h2>
        </div>
        <div className="mt-16 grid md:grid-cols-3">
          {FACTS.map((f, i) => (<FactCell key={i} fact={f} delay={i * 100} total={FACTS.length} index={i} />))}
        </div>
      </div>
    </section>
  );
}

function FactCell({ fact, delay, total, index }: { fact: typeof FACTS[0]; delay: number; total: number; index: number }) {
  const { ref, visible } = useInView(0.15);
  return (
    <div ref={ref} className={`group relative rounded-2xl bg-white px-8 py-10 transition-all duration-700 hover:shadow-[0_4px_24px_-6px_rgba(0,0,0,0.08)] ${index < total - 1 ? "mb-3 md:mb-0 md:mr-3" : ""}`} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)", transitionDelay: `${delay}ms` }}>
      <div className="text-5xl font-semibold leading-none tracking-tight text-black transition-transform duration-300 group-hover:-translate-y-0.5 md:text-6xl" style={{ fontFamily: "var(--font-display)" }}>{fact.stat}</div>
      <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/35">{fact.label}</div>
      <div className="mt-6 h-px w-8 bg-black/12 transition-all duration-300 group-hover:w-12 group-hover:bg-black/25" />
      <p className="mt-5 text-sm leading-relaxed text-black/45">{fact.body}</p>
    </div>
  );
}

function CtaBanner() {
  const { ref, visible } = useInView(0.2);
  return (
    <section className="border-t border-black/8 bg-white px-6 py-24 md:py-36">
      <div ref={ref} className="mx-auto max-w-2xl text-center transition-all duration-700" style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(28px)" }}>
        <h2 className="text-4xl font-medium leading-tight tracking-tight text-black md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>Start getting discovered<br />by other founders today.</h2>
        <p className="mx-auto mt-5 max-w-sm text-[15px] leading-relaxed text-black/40">Two minutes to set up. Free forever.<br />Cancel by deleting one line of code.</p>
        <div className="mt-10">
          <Link to="/apply" className="group inline-flex h-12 items-center rounded-lg bg-black px-7 text-sm font-medium text-white transition-all duration-200 hover:bg-black/80">
            Apply your startup<ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
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
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ email: data.user.email, name: data.user.user_metadata?.full_name?.split(" ")[0] ?? "" });
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser({ email: session.user.email, name: session.user.user_metadata?.full_name?.split(" ")[0] ?? "" });
      else setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() { await supabase.auth.signOut(); setUser(null); navigate({ to: "/" }); }

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="relative z-20 border-b border-black/8 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <nav className="flex items-center gap-2 text-sm">
            {!authReady ? null : user ? (
              <>
                <Link to="/dashboard" className="flex items-center gap-1.5 px-3 py-2 text-black/50 hover:text-black transition-colors"><LayoutDashboard className="h-4 w-4" />Dashboard</Link>
                <Link to="/account" className="rounded-md p-2 text-black/40 hover:text-black transition-colors" title="Account settings"><Settings className="h-4 w-4" /></Link>
                <button onClick={signOut} className="flex items-center gap-1.5 rounded-md border border-black/12 px-3 py-1.5 text-black/60 hover:border-black/25 hover:text-black transition-all"><LogOut className="h-3.5 w-3.5" />Sign out</button>
              </>
            ) : (
              <>
                <Link to="/privacy" className="px-3 py-2 text-black/40 hover:text-black transition-colors text-[13px]">Privacy</Link>
                <Link to="/terms" className="px-3 py-2 text-black/40 hover:text-black transition-colors text-[13px]">Terms</Link>
                <Link to="/auth" className="px-3 py-2 text-black/50 hover:text-black transition-colors">Sign in</Link>
                <Link to="/apply" className="inline-flex h-9 items-center rounded-md bg-black px-4 font-medium text-white hover:bg-black/80 transition-colors">Join the network</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-white">
        <HeroCanvas />
        <div className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-28 text-center sb-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3.5 py-1.5 text-xs text-black/60 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>
            Free forever · No money involved
          </div>
          <h1 className="mt-8 text-5xl font-medium leading-[1.05] tracking-tight text-black md:text-7xl" style={{ fontFamily: "var(--font-display)" }}>
            Founders helping founders<br />get their <em className="italic">first</em> traffic.
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-lg text-black/50 leading-relaxed">Add one line of code. A small bar appears on your site showing another founder's startup. In return, yours gets shown on theirs.</p>
          <div className="mt-10 flex items-center justify-center">
            <div className="flex items-center gap-3"><div className="h-3 w-10 rounded-sm bg-black" /><span className="text-2xl font-semibold tracking-tight text-black">StartupBar</span></div>
          </div>
          <div className="relative mx-auto mt-20 max-w-3xl">
            <div className="relative overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)]">
              <div className="flex h-9 items-center gap-2 border-b border-black/8 bg-black/[0.02] px-4">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" /><div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" /><div className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                <div className="ml-3 text-[11px] text-black/30">yourstartup.com</div>
              </div>
              <div className="flex h-9 items-center gap-3 border-b border-black/8 bg-white px-4 text-[13px]" style={{ color: "#0f172a" }}>
                <span className="rounded-sm bg-black px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">STARTUPBAR</span>
                <span className="font-medium">Acme AI</span>
                <span className="hidden text-black/40 sm:inline">— turn meeting notes into action items, automatically</span>
                <span className="ml-auto text-black/60">Visit →</span>
              </div>
              <div className="grid place-items-center bg-black/[0.02] px-6 py-24 text-xs text-black/20">your website continues here as normal</div>
            </div>
          </div>
        </div>
      </section>

      <HowItWorks />
      <WhyItWorks />
      <CtaBanner />

      <footer className="border-t border-black/8 bg-white px-6 py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex flex-col gap-1"><Logo /><span className="text-[11px] text-black/30">Built for founders, by founders.</span></div>
          <div className="flex items-center gap-5 text-xs text-black/40">
            <Link to="/auth" className="hover:text-black transition-colors">Sign in</Link>
            <Link to="/apply" className="hover:text-black transition-colors">Apply</Link>
            <Link to="/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-black transition-colors">Terms</Link>
            <span className="text-black/20">© {new Date().getFullYear()} StartupBar</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
