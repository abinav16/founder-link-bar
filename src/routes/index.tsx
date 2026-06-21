import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Code2, Network, Sparkles, Wallet, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StartupBar — Free traffic exchange for founders" },
      { name: "description", content: "Add one line of code to your site. A 36px bar shows another founder's startup. In return, your startup gets shown on theirs. Free." },
    ],
  }),
  component: Landing,
});

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="h-2 w-6 rounded-sm bg-primary" />
      <span className={`text-base font-semibold tracking-tight ${light ? "text-white" : ""}`}>StartupBar</span>
    </Link>
  );
}

function Header() {
  return (
    <header className="relative z-20 border-b border-white/5">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo light />
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/auth" className="px-3 py-2 text-white/60 hover:text-white transition-colors">Sign in</Link>
          <Link to="/apply" className="inline-flex h-9 items-center rounded-md bg-[#4c86e3] px-4 font-medium text-white hover:bg-[#5a91ea] transition-colors shadow-[0_0_20px_-4px_rgba(76,134,227,0.6)]">
            Join the network
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* HERO */}
      <section className="sb-hero-bg relative overflow-hidden">
        {/* Orbs */}
        <div className="sb-orb sb-orb-a" style={{ width: 520, height: 520, background: "#4c86e3", top: -120, left: -100 }} />
        <div className="sb-orb sb-orb-b" style={{ width: 600, height: 600, background: "#7c3aed", top: 80, right: -160 }} />
        <div className="sb-orb sb-orb-a" style={{ width: 380, height: 380, background: "#3b82f6", bottom: -120, left: "30%", opacity: 0.35 }} />

        {/* grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse at 50% 30%, black 40%, transparent 75%)",
          }}
        />

        <div className="relative z-10">
          <Header />
          <div className="mx-auto max-w-5xl px-6 pt-20 pb-28 text-center sb-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-white/70 backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              </span>
              Free forever · No money involved
            </div>

            <h1
              className="mt-8 text-5xl font-medium leading-[1.05] tracking-tight text-white md:text-7xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Founders helping founders<br />
              get their <em className="not-italic"><span className="italic" style={{ color: "#4c86e3" }}>first</span></em> traffic.
            </h1>

            <p className="mx-auto mt-7 max-w-xl text-lg text-white/60 leading-relaxed">
              Add one line of code. A small bar appears on your site showing another founder's startup. In return, yours gets shown on theirs.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/apply"
                className="group inline-flex h-12 items-center rounded-lg bg-[#4c86e3] px-6 text-sm font-medium text-white hover:bg-[#5a91ea] transition-all shadow-[0_0_30px_-4px_rgba(76,134,227,0.7)] hover:shadow-[0_0_40px_-2px_rgba(76,134,227,0.9)]"
              >
                Join the network
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how"
                className="inline-flex h-12 items-center rounded-lg border border-white/15 bg-white/[0.03] px-6 text-sm font-medium text-white/90 hover:bg-white/[0.07] transition-colors backdrop-blur-md"
              >
                How it works
              </a>
            </div>

            {/* Browser mock */}
            <div className="relative mx-auto mt-20 max-w-3xl">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#4c86e3]/40 via-purple-500/30 to-[#4c86e3]/40 blur-2xl opacity-60" />
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0f0f17] shadow-2xl">
                <div className="flex h-9 items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                  <div className="ml-3 text-[11px] text-white/40">yourstartup.com</div>
                </div>
                <div
                  className="flex h-9 items-center gap-3 border-b border-slate-200/80 bg-white px-4 text-[13px]"
                  style={{ color: "#0f172a", animation: "sb-bar-cycle 9s ease-in-out infinite" }}
                >
                  <span className="rounded-sm bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">STARTUPBAR</span>
                  <span className="font-medium">Acme AI</span>
                  <span className="hidden text-slate-500 sm:inline">— turn meeting notes into action items, automatically</span>
                  <span className="ml-auto text-slate-700 underline-offset-2 hover:underline">Visit →</span>
                </div>
                <div className="grid place-items-center bg-[#0f0f17] px-6 py-24 text-xs text-white/30">
                  your website continues here as normal
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-[#f7f7f5] px-6 py-28 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">How it works</div>
            <h2 className="mt-3 text-4xl font-medium tracking-tight md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
              Three steps. Done in two minutes.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", icon: Code2, title: "Add the script", body: "Drop one line of code into your site's <head>. A clean 36px bar appears at the top." },
              { n: "02", icon: Network, title: "Join the network", body: "Your startup is shown across other founders' sites — automatically and instantly." },
              { n: "03", icon: Sparkles, title: "Get real traffic", body: "Founders visiting other SaaS products discover yours. Real visitors, no fake clicks." },
            ].map((s) => (
              <div key={s.n} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 transition-all hover:border-slate-300 hover:shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
                <div
                  className="pointer-events-none absolute -right-4 -top-6 select-none text-[120px] font-bold leading-none text-slate-100 transition-colors group-hover:text-slate-200/80"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s.n}
                </div>
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY IT WORKS */}
      <section className="relative overflow-hidden bg-[#0a0a0f] px-6 py-28 text-white">
        <div className="sb-orb sb-orb-b" style={{ width: 500, height: 500, background: "#4c86e3", top: "10%", left: "-10%", opacity: 0.3 }} />
        <div className="sb-orb sb-orb-a" style={{ width: 500, height: 500, background: "#7c3aed", bottom: "-20%", right: "-10%", opacity: 0.3 }} />

        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">Why it works</div>
            <h2 className="mt-3 text-4xl font-medium tracking-tight md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
              The fairest growth channel<br />you'll ever ship.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              { icon: Wallet, title: "Zero cost", body: "No ad budget, no CPMs, no commitments. Trade pixels, not dollars." },
              { icon: Users, title: "Founder audience", body: "Your bar shows up on sites built by people who already buy SaaS." },
              { icon: Zap, title: "Fully automatic", body: "No dashboards to babysit. Install once and let the network run." },
            ].map((c, i) => (
              <div
                key={i}
                className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#4c86e3]/0 via-transparent to-purple-500/0 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: "radial-gradient(circle at top left, rgba(76,134,227,0.15), transparent 60%)" }}
                />
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#4c86e3]">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{c.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-14 text-center backdrop-blur-md">
            <h3 className="text-3xl font-medium tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
              Ready to send and receive traffic?
            </h3>
            <p className="max-w-md text-sm text-white/60">Two minutes to set up. Free forever. Cancel by deleting one line of code.</p>
            <Link
              to="/apply"
              className="inline-flex h-12 items-center rounded-lg bg-[#4c86e3] px-6 text-sm font-medium text-white hover:bg-[#5a91ea] transition-all shadow-[0_0_30px_-4px_rgba(76,134,227,0.7)]"
            >
              Apply your startup <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#0a0a0f] px-6 py-12 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <Logo light />
            <div className="text-xs text-white/40">Built for founders, by founders.</div>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/50">
            <Link to="/auth" className="hover:text-white transition-colors">Sign in</Link>
            <Link
              to="/apply"
              className="inline-flex h-9 items-center rounded-md bg-[#4c86e3] px-4 text-xs font-medium text-white hover:bg-[#5a91ea] transition-colors"
            >
              Join the network
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl text-center text-[11px] text-white/30">
          © {new Date().getFullYear()} StartupBar
        </div>
      </footer>
    </div>
  );
}
