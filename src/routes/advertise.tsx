import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Image as ImageIcon, Mail, MousePointerClick, Sparkles, X, BarChart3, Zap, Rocket, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { CLICK_PACKS, NEWSLETTER_PRICE_PER_FOUNDER_USD } from "@/lib/checkout-plans";

export const Route = createFileRoute("/advertise")({
  head: () => ({
    meta: [
      { title: "Advertise on StartupBar: reach founders and early adopters" },
      { name: "description", content: "Banner ads across the StartupBar network, gold highlights with guaranteed clicks, and Sunday newsletter sponsorships. Open to any company." },
      { property: "og:title", content: "Advertise on StartupBar" },
      { property: "og:description", content: "Banner ads, gold highlights and newsletter sponsorships in front of founders and makers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://startupbar.co/advertise" }],
  }),
  component: AdvertisePage,
});

const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, className: shown ? "adx-reveal is-in" : "adx-reveal" };
}

function Sk({ w = "100%" }: { w?: string }) { return <i className="adx-sk" style={{ width: w }} />; }
function Row({ i }: { i: number }) {
  return <div className="adx-row" style={{ animationDelay: `${i * 80}ms` }}><b className="adx-sk adx-sk-logo" /><span><Sk w={`${55 + ((i * 17) % 30)}%`} /><Sk w={`${35 + ((i * 11) % 25)}%`} /></span><Sk w="44px" /></div>;
}

const PRODUCTS = [
  { id: "banner", icon: ImageIcon, name: "Banner ad", who: "Any company", price: "$49", unit: "per week", line: "Your image inside the Network, Leaderboard and startup pages.", facts: ["Upload a desktop and a mobile image", "Run 1 to 52 weeks, pay once", "Starts only after we approve it"] },
  { id: "gold", icon: MousePointerClick, name: "Gold highlight", who: "Listed startups", price: `$${CLICK_PACKS[0].priceUsd}`, unit: `for ${CLICK_PACKS[0].clicks} clicks`, line: "Your listing is highlighted in gold on the Network and Leaderboard pages and shown first until your clicks are delivered.", facts: ["Gold highlight on Network & Leaderboard", "Real clicks guaranteed", `Packs of ${CLICK_PACKS.map((p) => p.clicks).join(" / ")} clicks`, "Track delivery in your dashboard"] },
  { id: "newsletter", icon: Mail, name: "Newsletter spot", who: "Listed startups", price: `$${NEWSLETTER_PRICE_PER_FOUNDER_USD.toFixed(2)}`, unit: "per founder", line: "The single sponsor slot in our Sunday email to every founder.", facts: ["One sponsor per Sunday", "Pick any free Sunday", "Sent to the whole founder list"] },
] as const;
type PId = (typeof PRODUCTS)[number]["id"];

function HeroArt() {
  const [f, setF] = useState(0);
  useEffect(() => { const t = setInterval(() => setF((v) => (v + 1) % 3), 3200); return () => clearInterval(t); }, []);
  const labels = ["Banner", "Gold highlight", "Newsletter"];
  return (
    <div className="adx-stage">
      <div className="adx-ring" /><div className="adx-ring adx-ring-2" />
      <div className="adx-phone">
        <div className="adx-phone-top"><b className="adx-capsule" /><Sk w="40%" /></div>
        <Row i={0} />
        <div className="adx-slot">
          <div className={`adx-slide ${f === 0 ? "is-on" : ""}`}><div className="adx-mini-banner"><span className="adx-adtag">Ad</span><Rocket className="size-5" /><div><strong>Launch week is live</strong><small>50% off for founders</small></div><em>Get it</em></div></div>
          <div className={`adx-slide ${f === 1 ? "is-on" : ""}`}><div className="adx-row adx-gold"><b className="adx-capsule" /><span><strong>Your startup</strong><small>Gold highlight · shown first</small></span><em className="adx-count">+1</em></div></div>
          <div className={`adx-slide ${f === 2 ? "is-on" : ""}`}><div className="adx-sponsor"><span className="adx-adtag">Sponsor</span><Mail className="size-5" /><div><strong>Sunday newsletter</strong><small>Sent to every founder</small></div></div></div>
        </div>
        {[1, 2, 3].map((i) => <Row key={i} i={i} />)}
        <div className="adx-dots">{labels.map((l, i) => <i key={l} className={f === i ? "is-on" : ""} />)}</div>
      </div>
      <div className="adx-float adx-float-1"><span>Clicks today</span><strong>+128</strong><svg viewBox="0 0 80 24"><path d="M0 20 L12 16 L24 18 L36 10 L48 12 L60 5 L80 2" /></svg></div>
      <div className="adx-float adx-float-2"><Check className="size-4" /> Now showing: <b>{labels[f]}</b></div>
    </div>
  );
}

function ClickMeter() {
  const total = 500;
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((v) => (v >= total ? 0 : Math.min(total, v + 7))), 60);
    return () => clearInterval(t);
  }, []);
  const pct = (n / total) * 100;
  return <div className="adx-meter"><div className="adx-meter-head"><span>Clicks delivered</span><strong>{n} <small>/ {total}</small></strong></div><div className="adx-meter-track"><i style={{ width: `${pct}%` }} /></div><div className="adx-meter-foot"><span>Pack: 500 clicks</span><span>{n >= total ? "Delivered ✓" : `${Math.round(pct)}%`}</span></div></div>;
}

function Diagram({ id }: { id: PId }) {
  if (id === "banner") return (
    <div className="adx-browser" key="b"><div className="adx-bar"><i /><i /><i /><span>startupbar.co/network</span></div>
      <div className="adx-page">{[0, 1, 2].map((i) => <Row key={i} i={i} />)}
        <div className="adx-banner"><span className="adx-adtag">Ad</span>
          <div className="adx-cr-copy"><strong>Ship to <em>every</em> founder.</strong><div className="adx-cr-row"><span className="adx-cr-btn">Try your product free</span><small>Your headline, image<br />and link, right here.</small></div></div>
          <div className="adx-dock">{[BarChart3, Zap, Rocket, Globe, Sparkles].map((I, i) => <span key={i} className={i === 2 ? "is-up" : ""}><I /></span>)}</div>
          <MousePointerClick className="adx-cursor" /></div>
        {[3, 4].map((i) => <Row key={i} i={i} />)}</div></div>
  );
  if (id === "gold") return (
    <div className="adx-browser" key="g"><div className="adx-bar"><i /><i /><i /><span>startupbar.co/leaderboard</span></div>
      <div className="adx-page"><Row i={0} /><div className="adx-row adx-gold"><b className="adx-capsule" /><span><strong>Your startup</strong><small>Gold highlight · shown first</small></span><em className="adx-count">+1 click</em></div>{[1, 2, 3].map((i) => <Row key={i} i={i} />)}
        <ClickMeter /></div></div>
  );
  return (
    <div className="adx-email" key="n">
      <div className="adx-email-head">
        <div className="adx-email-from"><b className="adx-avatar"><i className="adx-capsule" /></b><div><strong>StartupBar Weekly</strong><small>to you · Sunday 9:00 AM</small></div><Mail className="size-4 ml-auto opacity-50" /></div>
        <p className="adx-email-subject">This week on StartupBar 🚀</p>
      </div>
      <div className="adx-email-body">
        <div className="adx-email-brand"><i className="adx-capsule" /> StartupBar</div>
        <p className="adx-email-hi">Hi founder,</p><Sk w="92%" /><Sk w="70%" />
        <div className="adx-email-sponsor"><span className="adx-adtag">Sponsored</span><b className="adx-sk adx-sk-logo" /><div><strong>Your startup</strong><small>One line about your product</small></div><em>Try it →</em></div>
        <p className="adx-email-label">Top startups this week</p>
        {[0, 1].map((i) => <div key={i} className="adx-email-item"><b className="adx-sk adx-sk-logo" /><span><Sk w="60%" /><Sk w="40%" /></span></div>)}
        <div className="adx-fly">{[0, 1, 2, 3, 4].map((i) => <Mail key={i} style={{ animationDelay: `${i * 0.5}s` }} />)}</div>
      </div>
    </div>
  );
}

function AdvertisePage() {
  const [active, setActive] = useState<PId>("banner");
  const product = PRODUCTS.find((p) => p.id === active)!;
  const steps = useReveal<HTMLDivElement>();
  const pick = useReveal<HTMLDivElement>();
  const { data: stats } = useQuery({
    queryKey: ["advertise-stats"],
    queryFn: async () => {
      const [t, a, s] = await Promise.all([
        supabase.rpc("public_network_totals_all"),
        supabase.rpc("public_newsletter_audience"),
        supabase.from("startups").select("id", { count: "exact", head: true }).eq("status", "approved"),
      ]);
      const row = (t.data as { total_impressions: number }[] | null)?.[0];
      return { views: Number(row?.total_impressions ?? 0), founders: Number(a.data ?? 0), sites: s.count ?? 0 };
    },
    staleTime: 10 * 60_000,
  });

  return (
    <DashboardLayout fullWidth>
      <div className="adx">
        <section className="adx-hero adx-wrap">
          <div className="adx-hero-copy">
            <p className="adx-eyebrow"><Sparkles className="size-3.5" /> Advertise on StartupBar</p>
            <h1>Get seen by the people <span>building the internet.</span></h1>
            <p className="adx-lead">Three simple ways to reach founders and early adopters. Pick one, pay once, track every click.</p>
            <div className="adx-cta"><Button asChild size="lg" className="h-12 rounded-full"><Link to="/advertise/new">Start a campaign <ArrowRight /></Link></Button><Button asChild variant="outline" size="lg" className="h-12 rounded-full"><a href="#choose">Compare options</a></Button></div>
            <dl className="adx-stats">{[["Member sites", stats ? fmt(stats.sites) : "..."], ["Founders on email", stats ? fmt(stats.founders) : "..."], ["Network widget views*", stats ? fmt(stats.views) : "..."]].map(([l, v]) => <div key={l}><dd>{v}</dd><dt>{l}</dt></div>)}</dl>
            <p className="adx-note">*Across member sites, not banner reach. Every campaign reports its own real views and clicks.</p>
          </div>
          <div className="adx-hero-art" aria-hidden="true"><HeroArt /></div>
        </section>

        <section id="choose" className="adx-choose"><div ref={pick.ref} className={`adx-wrap ${pick.className}`}>
          <p className="adx-eyebrow">Step 1 · Choose</p><h2>Which one is for you?</h2>
          <div className="adx-tabs" role="tablist">{PRODUCTS.map((p) => <button key={p.id} role="tab" aria-selected={active === p.id} className="adx-tab" onClick={() => setActive(p.id)}><p.icon className="size-5" /><span><strong>{p.name}</strong><small>{p.who}</small></span><em>{p.price}<small> {p.unit}</small></em></button>)}</div>
          <div className="adx-detail" key={active}>
            <div><h3>{product.name}</h3><p>{product.line}</p><ul>{product.facts.map((f) => <li key={f}><Check className="size-4" />{f}</li>)}</ul>
              <Button asChild className="mt-6 rounded-full"><Link to="/advertise/new">Choose {product.name.toLowerCase()} <ArrowRight /></Link></Button></div>
            <Diagram id={active} />
          </div>
        </div></section>

        <section className="adx-wrap adx-steps-wrap"><div ref={steps.ref} className={steps.className}>
          <p className="adx-eyebrow">Step 2 · Launch</p><h2>Live in four easy steps.</h2>
          <ol className="adx-steps">{[["Pick", "Choose a format above."], ["Upload", "Add your images or pick a Sunday."], ["Pay once", "No subscription, no surprise fees."], ["Go live", "We approve it, then your time starts then."]].map(([t, b], i) => <li key={t} style={{ transitionDelay: `${i * 180}ms` }}><span>{i + 1}</span><strong>{t}</strong><p>{b}</p></li>)}</ol>
        </div></section>

        <section className="adx-wrap adx-compare"><p className="adx-eyebrow">At a glance</p><h2>Side by side.</h2>
          <div className="adx-plans">{PRODUCTS.map((p, idx) => {
            const rows: [string, boolean | string][] = [
              ["Where it shows", ["Network, Leaderboard, profiles", "Network & Leaderboard lists", "Sunday email"][idx]],
              ...[
                ["Your own desktop and mobile image", "Run 1 to 52 weeks, paid once", "Starts only after approval", "See real views and clicks"],
                ["Gold glow on your listing", "Shown first in rotation", "Clicks guaranteed", "Track delivery live"],
                ["The only sponsor that Sunday", "Pick any free Sunday", "Your logo, one line and link", "Lands in every founder's inbox"],
              ][idx].map((t) => [t, true] as [string, boolean]),
            ];
            const price = ["$49", `$${CLICK_PACKS[0].priceUsd} to $${CLICK_PACKS[CLICK_PACKS.length - 1].priceUsd}`, `$${NEWSLETTER_PRICE_PER_FOUNDER_USD.toFixed(2)}`][idx];
            const unit = ["per week, 1 to 52 weeks", "per click pack", "per founder on the list"][idx];
            return (
              <article key={p.id} className={`adx-plan ${idx === 1 ? "is-feature" : ""}`} style={{ animationDelay: `${idx * 120}ms` }}>
                {idx === 1 && <span className="adx-plan-badge">Guaranteed clicks</span>}
                <div className="adx-plan-icon"><p.icon className="size-5" /></div>
                <h3>{p.name}</h3><p className="adx-plan-who">{p.who}</p>
                <p className="adx-plan-price">{price}</p><p className="adx-plan-unit">{unit}</p>
                <ul>{rows.map(([l, v]) => <li key={l} className={v === false ? "is-off" : ""}>{typeof v === "string" ? <><span>{l}</span><b>{v}</b></> : <>{v ? <Check className="size-4" /> : <X className="size-4" />}<span>{l}</span></>}</li>)}</ul>
                <Button asChild variant={idx === 1 ? "default" : "outline"} className="mt-auto w-full rounded-full"><Link to="/advertise/new">Choose {p.name.toLowerCase()} <ArrowRight /></Link></Button>
              </article>
            );
          })}</div>
        </section>

        <section className="adx-wrap adx-faq"><h2>Questions</h2><div>{[
          ["Do I need a listed startup?", "Not for banners. Any company can advertise after signing in. Gold highlights and newsletter spots are for listed startups."],
          ["What sizes do banners need?", "Desktop at least 1200 × 200 px (6:1), mobile at least 600 × 300 px (2:1). PNG, JPG or WebP up to 5 MB."],
          ["Are banner views guaranteed?", "No. Banners share random rotation for the weeks you buy, and you see actual views and clicks. Guaranteed clicks come with Gold highlights."],
          ["What if my banner is rejected?", "We tell you why and refund your payment through Dodo."],
        ].map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>

        <section className="adx-end"><div className="adx-wrap"><h2>Ready to be discovered?</h2><Button asChild size="lg" variant="secondary" className="h-12 rounded-full"><Link to="/advertise/new">Start a campaign <ArrowRight /></Link></Button></div></section>
      </div>
    </DashboardLayout>
  );
}
