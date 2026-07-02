import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { ArrowRight, Mail, Lock, User } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — StartupBar" },
      { name: "description", content: "Sign in or create your StartupBar account to manage your startup, track impressions, and join the founder traffic exchange." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),
  component: AuthPage,
});

function ConstellationPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logosRef = useRef<{ img: HTMLImageElement; dotIdx: number }[]>([]);

  useEffect(() => {
    supabase.from("startups").select("website_url").eq("status", "approved").then(({ data }) => {
      if (!data || data.length === 0) return;
      logosRef.current = data.map((s, i) => {
        const img = new Image();
        img.src = `https://www.google.com/s2/favicons?domain=${s.website_url}&sz=32`;
        return { img, dotIdx: i * 5 };
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
    const RINGS = [70, 130, 200, 280];

    const init = () => {
      dots = [];
      const cx = canvas.width / 2; const cy = canvas.height / 2;
      RINGS.forEach((radius, ri) => {
        const count = 6 + ri * 4;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const speed = (0.0012 + Math.random() * 0.0008) * (Math.random() > 0.5 ? 1 : -1);
          dots.push({ angle, speed, radius, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, r: 1.5 + Math.random() * 1.5, ringIdx: ri, dotIdx: dots.length });
        }
      });
    };

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; init(); };

    const draw = () => {
      const cx = canvas.width / 2; const cy = canvas.height / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      RINGS.forEach((r) => {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.stroke();
      });

      dots.forEach((d) => {
        d.angle += d.speed;
        const tx = cx + Math.cos(d.angle) * d.radius; const ty = cy + Math.sin(d.angle) * d.radius;
        if (mouse.inside) {
          const dx = mouse.x - tx; const dy = mouse.y - ty; const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) { const pull = (1 - dist / 160) * 0.3; d.x += (tx + dx * pull - d.x) * 0.1; d.y += (ty + dy * pull - d.y) * 0.1; }
          else { d.x += (tx - d.x) * 0.1; d.y += (ty - d.y) * 0.1; }
        } else { d.x += (tx - d.x) * 0.1; d.y += (ty - d.y) * 0.1; }
      });

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          if (dots[i].ringIdx !== dots[j].ringIdx) continue;
          const dx = dots[i].x - dots[j].x; const dy = dots[i].y - dots[j].y; const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${(1 - dist / 90) * 0.12})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }

      if (mouse.inside) {
        dots.forEach((d) => {
          const dx = mouse.x - d.x; const dy = mouse.y - d.y; const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(255,255,255,${(1 - dist / 140) * 0.25})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        });
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 60);
        g.addColorStop(0, "rgba(255,255,255,0.06)"); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 60, 0, Math.PI * 2); ctx.fill();
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
          ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 0.8; ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fill();
        }
      });

      animId = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
      mouse.inside = mouse.x >= 0 && mouse.x <= canvas.width && mouse.y >= 0 && mouse.y <= canvas.height;
    };
    const onLeave = () => { mouse.inside = false; };

    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    resize(); draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div className="relative hidden h-full flex-col items-center justify-center overflow-hidden bg-[#080808] md:flex">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="relative z-10 flex flex-col items-center gap-3 text-white">
        <div className="flex items-center gap-3">
          <div className="h-3 w-10 rounded-sm bg-white" />
          <span className="text-2xl font-semibold tracking-tight">StartupBar</span>
        </div>
        <p className="mt-1 text-center text-sm text-white/40 max-w-[200px] leading-relaxed">The founder traffic exchange network</p>
      </div>
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-xs text-white/20">Free forever · Built for indie founders</p>
      </div>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function consumeNext(): "/apply" | "/dashboard" {
    if (typeof window === "undefined") return "/dashboard";
    const next = sessionStorage.getItem("startupbar:auth-next");
    if (next === "/apply") {
      sessionStorage.removeItem("startupbar:auth-next");
      return "/apply";
    }
    return "/dashboard";
  }

  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: consumeNext() }); }); }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      if (mode === "signup") {
        const next = typeof window !== "undefined" ? sessionStorage.getItem("startupbar:auth-next") : null;
        const redirectPath = next === "/apply" ? "/apply" : "/dashboard";
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}${redirectPath}`, data: { full_name: name } } });
        if (error) throw error;
        supabase.functions.invoke("send-email", { body: { type: "welcome", data: { email, name } } }).catch(() => {});
        toast.success("Account created — check your email to confirm."); setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: consumeNext() });
      }
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <ConstellationPanel />
      <div className="flex flex-col bg-white px-8 py-10 md:px-14">
        <Link to="/" className="flex items-center gap-2"><div className="h-2 w-6 rounded-sm bg-black" /><span className="text-base font-semibold tracking-tight text-black">StartupBar</span></Link>
        <main className="mx-auto mt-auto w-full max-w-sm py-16">

          <h1 className="text-3xl font-medium tracking-tight text-black" style={{ fontFamily: "var(--font-display)" }}>{mode === "signin" ? "Welcome back." : "Join the network."}</h1>
          <p className="mt-2 text-sm text-black/40">{mode === "signin" ? "Sign in to your StartupBar dashboard." : "Create your account and apply your startup."}</p>

          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              const next = typeof window !== "undefined" ? sessionStorage.getItem("startupbar:auth-next") : null;
              const redirectPath = next === "/apply" ? "/apply" : "/dashboard";
              const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}${redirectPath}` });
              if (result.error) { toast.error(result.error.message); setLoading(false); return; }
              if (result.redirected) return;
              navigate({ to: consumeNext() });
            }}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg border border-black/12 bg-white py-3 text-sm font-medium text-black transition-all hover:bg-black/[0.03] hover:border-black/25 disabled:opacity-50"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-black/8" /><span className="text-xs text-black/30">or</span><div className="h-px flex-1 bg-black/8" />
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/25" />
                <input type="text" required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-black/12 bg-white py-3 pl-10 pr-4 text-sm text-black placeholder:text-black/25 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/8" />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/25" />
              <input type="email" required placeholder="you@startup.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-black/12 bg-white py-3 pl-10 pr-4 text-sm text-black placeholder:text-black/25 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/8" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/25" />
              <input type="password" required minLength={6} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-black/12 bg-white py-3 pl-10 pr-4 text-sm text-black placeholder:text-black/25 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/8" />
            </div>
            <button type="submit" disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3.5 text-sm font-medium text-white transition-all hover:bg-black/80 disabled:opacity-50">
              {loading ? "Please wait…" : (<>{mode === "signin" ? "Sign in" : "Create account"}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>)}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-black/40">
            {mode === "signin" ? (<>New to StartupBar?{" "}<button onClick={() => setMode("signup")} className="font-medium text-black hover:underline underline-offset-2">Create an account</button></>) : (<>Already have an account?{" "}<button onClick={() => setMode("signin")} className="font-medium text-black hover:underline underline-offset-2">Sign in</button></>)}
          </div>
        </div>
        <div className="mt-auto text-center"><Link to="/" className="text-xs text-black/30 hover:text-black/60 transition-colors">← Back to StartupBar.co</Link></div>
      </div>
    </div>
  );
}
