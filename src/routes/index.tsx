import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Code2, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StartupBar — Free traffic exchange for founders" },
      { name: "description", content: "Add one line of code to your site. A 36px bar shows another founder's startup. In return, your startup gets shown on theirs. Free." },
    ],
  }),
  component: Landing,
});

function Header() {
  return (
    <header className="border-b border-border/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-2 w-6 rounded-sm bg-primary" />
          <span className="text-base font-semibold tracking-tight">StartupBar</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/auth" className="px-3 py-2 text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/apply" className="inline-flex h-9 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground hover:opacity-90">
            Join the network
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Demo bar peeking at top */}
      <section className="px-6 pt-20 pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Free forever · No money involved
          </div>
          <h1 className="mt-6 text-5xl font-medium tracking-tight md:text-6xl" style={{ fontFamily: "var(--font-display)" }}>
            Founders helping founders<br />get their first traffic.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Add one line of code. A small bar appears on your site showing another founder's startup. In return, yours gets shown on theirs.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/apply" className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90">
              Join the network <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <a href="#how" className="inline-flex h-11 items-center rounded-md border border-input bg-background px-6 text-sm font-medium hover:bg-accent">
              How it works
            </a>
          </div>
        </div>

        {/* Bar mockup */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_60px_-30px_rgba(0,0,0,0.18)]">
            <div className="flex h-9 items-center gap-2 border-b border-border bg-muted/60 px-4">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <div className="ml-3 text-xs text-muted-foreground">yourstartup.com</div>
            </div>
            <div className="flex h-9 items-center gap-3 border-b border-border bg-white px-4 text-[13px]" style={{ color: "#0f172a" }}>
              <span className="rounded-sm bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">STARTUPBAR</span>
              <span className="font-medium">Acme AI</span>
              <span className="text-slate-500">— turn meeting notes into action items, automatically</span>
              <span className="ml-auto text-slate-700 underline-offset-2 hover:underline">Visit →</span>
            </div>
            <div className="grid place-items-center px-6 py-20 text-sm text-muted-foreground">
              your website continues here as normal
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border bg-muted/30 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-medium tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
            Three steps. Done in two minutes.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Users, title: "Apply your startup", body: "Submit your name, URL, and a one-line description. We approve quality startups within a day." },
              { icon: Code2, title: "Paste one script tag", body: "Drop a single line of code in your site's <head>. The 36px bar appears at the top." },
              { icon: Zap, title: "Get free traffic", body: "Your startup is shown on partner sites. Founders click through. Repeat." },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Step {i + 1}</div>
                <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ-ish */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-medium tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>Why we built it</h2>
            <p className="mt-4 text-muted-foreground">
              The first 100 visitors are the hardest. Ads cost money. SEO takes months. But every founder has one thing: their own website.
            </p>
            <p className="mt-3 text-muted-foreground">
              StartupBar is a fair trade — you give an unobtrusive sliver of pixels, you get shown on every other founder's site. No money. No catch.
            </p>
          </div>
          <div className="space-y-6">
            <Q q="How big is the bar?" a="36 pixels tall. Light background. It looks intentional, not spammy." />
            <Q q="Is it really free?" a="Yes. No money changes hands. It's pure exchange." />
            <Q q="Can I remove it later?" a="Of course. Delete the script tag and you're out." />
            <Q q="Who gets shown?" a="A random approved startup, never your own. Stats update in your dashboard." />
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-primary px-6 py-20 text-primary-foreground">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-medium tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Ready to send and receive traffic?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/70">
            Takes 2 minutes. Free. No credit card. Cancel anytime by deleting one line of code.
          </p>
          <Link to="/apply" className="mt-8 inline-flex h-11 items-center rounded-md bg-primary-foreground px-6 text-sm font-medium text-primary hover:opacity-90">
            Apply your startup <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground md:flex-row">
          <div>© {new Date().getFullYear()} StartupBar. Made for founders.</div>
          <div className="flex gap-6">
            <Link to="/apply">Apply</Link>
            <Link to="/auth">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Q({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-b border-border pb-6 last:border-0">
      <div className="font-medium">{q}</div>
      <div className="mt-1 text-sm text-muted-foreground">{a}</div>
    </div>
  );
}
