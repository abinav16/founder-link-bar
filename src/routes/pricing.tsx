import { DashboardLayout } from "@/components/DashboardLayout";
import { ArrowRight, Check, Clock, Crown, DollarSign, Globe, Layers, MousePointerClick, Receipt, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { SUPPORTER_PRICE_USD, SUPPORTER_TRIAL_DAYS } from "@/lib/supporter";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CLICK_PACKS, packSavingsPct, perClick } from "@/lib/checkout-plans";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing | StartupBar" },
      { name: "description", content: "StartupBar pricing: first startup listing free forever, extra listings $9.99 one-time, and Guaranteed Clicks packs from $49 one-time. Supporter: seven days free, then $999/year. Payments processed by Dodo Payments." },
      { property: "og:title", content: "Pricing | StartupBar" },
      { property: "og:description", content: "First listing free. Extra listings $9.99 one-time. Guaranteed Clicks from $49 one-time. Supporter: seven days free, then $999/year, cancel anytime." },
      { property: "og:url", content: "https://startupbar.co/pricing" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://startupbar.co/pricing" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "StartupBar listings and Guaranteed Clicks",
          description: "Startup listings in the StartupBar traffic exchange network, plus one-time Guaranteed Clicks packs.",
          brand: { "@type": "Brand", name: "StartupBar" },
          offers: [
            {
              "@type": "Offer",
              name: "First listing",
              price: "0",
              priceCurrency: "USD",
              url: "https://startupbar.co/pricing",
              availability: "https://schema.org/InStock",
            },
            {
              "@type": "Offer",
              name: "Additional listing",
              price: "9.99",
              priceCurrency: "USD",
              url: "https://startupbar.co/pricing",
              availability: "https://schema.org/InStock",
            },
            {
              "@type": "Offer",
              name: "Supporter membership",
              description: `${SUPPORTER_TRIAL_DAYS} days free, then $${SUPPORTER_PRICE_USD} USD per year, taxes included.`,
              price: String(SUPPORTER_PRICE_USD),
              priceCurrency: "USD",
              url: "https://startupbar.co/pricing",
              availability: "https://schema.org/InStock",
            },
                      ],
        }),
      },
    ],
  }),
  component: PricingPage,
});


type Membership = { loading: boolean; signedIn: boolean; listings: number };

function useMembership(): Membership {
  const [state, setState] = useState<Membership>({ loading: true, signedIn: false, listings: 0 });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        if (!cancelled) setState({ loading: false, signedIn: false, listings: 0 });
        return;
      }
      const { count } = await supabase
        .from("startups")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("status", "rejected");
      if (!cancelled) setState({ loading: false, signedIn: true, listings: count ?? 0 });
    }

    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  return state;
}

function PricingPage() {
  const { loading, signedIn, listings } = useMembership();
  const [pack, setPack] = useState(2);
  const sel = CLICK_PACKS[pack];

  const freeCta = loading ? null : !signedIn ? <Link to="/apply" className="pr-btn">Join free <ArrowRight className="size-4" /></Link>
    : listings > 0 ? <Link to="/dashboard" className="pr-btn pr-btn-ghost">Free listing active · Dashboard</Link>
    : <Link to="/apply" className="pr-btn">List your startup free <ArrowRight className="size-4" /></Link>;
  const extraCta = loading ? null : !signedIn ? <Link to="/auth" className="pr-btn pr-btn-ghost">Sign in to add another</Link>
    : listings === 0 ? <span className="pr-btn pr-btn-ghost is-disabled">List your first startup first</span>
    : <Link to="/apply" className="pr-btn">Add another startup <ArrowRight className="size-4" /></Link>;

  const plans = [
    { tag: "Start here", name: "First listing", price: "$0", unit: "forever", icon: Rocket, cta: freeCta, items: ["One startup in the network", "Your bar shown on every member site", "Public startup profile", "Impressions and clicks dashboard", "Leaderboard and network listing"] },
    { tag: "More startups", name: "Extra listing", price: "$9.99", unit: "one time, per listing", icon: Layers, cta: extraCta, items: ["Everything in the first listing", "Another startup on the same account", "Paid once, no subscription", "Reviewed before it goes live"] },
    { tag: "No bar needed", name: "Supporter", price: `$${SUPPORTER_PRICE_USD}`, unit: `per year after ${SUPPORTER_TRIAL_DAYS} days free`, icon: Crown, gold: true, cta: <Link to="/apply" className="pr-btn">Start free trial <ArrowRight className="size-4" /></Link>, items: ["Nothing shown on your site", "Full listing, profile and dashboard", "Gold highlight with a Supporter tag", "Average member's share of the network", "Cancel during the trial for free"] },
  ];

  return (
    <DashboardLayout fullWidth>
      <div className="adx pr">
        <section className="adx-wrap pr-hero">
          <p className="adx-eyebrow"><Sparkles className="size-3.5" /> Pricing</p>
          <h1>Free to join. <span>Pay only to grow faster.</span></h1>
          <p className="adx-lead">Your first startup is free forever. Everything else is a clear one time payment, except Supporter.</p>
          <div className="pr-loop" aria-hidden="true">
            <div className="pr-node"><Globe className="size-5" /><strong>Your site</strong><small>shows the bar</small></div>
            <div className="pr-path"><i /><i /><i /></div>
            <div className="pr-node pr-node-center"><b className="adx-capsule" /><strong>StartupBar network</strong><small>{"shares visitors fairly"}</small></div>
            <div className="pr-path"><i /><i /><i /></div>
            <div className="pr-node"><MousePointerClick className="size-5" /><strong>Your startup</strong><small>gets clicks back</small></div>
          </div>
        </section>

        <section className="adx-wrap">
          <div className="pr-plans">{plans.map((p, i) => (
            <article key={p.name} className={`pr-plan ${p.gold ? "is-gold" : ""}`} style={{ animationDelay: `${i * 120}ms` }}>
              <span className="adx-plan-badge">{p.tag}</span>
              <div className="adx-plan-icon"><p.icon className="size-5" /></div>
              <h3>{p.name}</h3>
              <p className="adx-plan-price">{p.price}</p><p className="adx-plan-unit">{p.unit}</p>
              <ul>{p.items.map((t) => <li key={t}><Check className="size-4" />{t}</li>)}</ul>
              <div className="mt-auto">{p.cta ?? <span className="pr-btn pr-btn-ghost is-disabled">Loading…</span>}</div>
            </article>
          ))}</div>
        </section>

        <section id="clicks" className="adx-wrap pr-clicks scroll-mt-24">
          <div className="pr-clicks-copy">
            <p className="adx-eyebrow">Guaranteed clicks</p>
            <h2>Want more visitors? Buy clicks, once.</h2>
            <p className="adx-lead">Your startup gets a gold highlight on the Network and Leaderboard pages and priority in the bar until every real, bot filtered click is delivered.</p>
            <div className="pr-packs" role="radiogroup">{CLICK_PACKS.map((c, i) => (
              <button key={c.clicks} role="radio" aria-checked={pack === i} onClick={() => setPack(i)} className="pr-pack">
                <strong>{c.clicks.toLocaleString()}</strong><small>clicks</small><em>${c.priceUsd}</em>
                {packSavingsPct(c) > 0 && <span>Save {packSavingsPct(c)}%</span>}
              </button>
            ))}</div>
            <div className="flex flex-wrap items-center gap-4 mt-6">
              <Link to="/apply" className="pr-btn">Get {sel.clicks.toLocaleString()} clicks for ${sel.priceUsd} <ArrowRight className="size-4" /></Link>
              <Link to="/dashboard" className="text-sm underline underline-offset-4">Already listed? Buy from your dashboard</Link>
            </div>
          </div>
          <div className="pr-chart" aria-label="Price per click by pack">
            <p className="pr-chart-title">Price per click</p>
            <div className="pr-bars">{CLICK_PACKS.map((c, i) => {
              const max = perClick(CLICK_PACKS[0]);
              return <button key={c.clicks} onClick={() => setPack(i)} className={`pr-bar ${pack === i ? "is-on" : ""}`}>
                <span className="pr-bar-val">${perClick(c).toFixed(2)}</span>
                <i style={{ height: `${(perClick(c) / max) * 100}%`, animationDelay: `${i * 120}ms` }} />
                <small>{c.clicks.toLocaleString()}</small>
              </button>;
            })}</div>
            <div className="pr-chart-foot"><span>Delivered</span><div className="adx-meter-track"><i style={{ width: "100%" }} className="pr-fill" /></div><strong>{sel.clicks.toLocaleString()} / {sel.clicks.toLocaleString()}</strong></div>
          </div>
        </section>

        <section className="adx-wrap adx-steps-wrap">
          <p className="adx-eyebrow">How paying works</p><h2>Simple and safe.</h2>
          <div className="pr-facts">{[
            [ShieldCheck, "Secure checkout", "Payments run through Dodo Payments. We never see your card."],
            [Receipt, "One time payments", "Listings and click packs never renew."],
            [Clock, `${SUPPORTER_TRIAL_DAYS} day free trial`, `Supporter is free for ${SUPPORTER_TRIAL_DAYS} days, then $${SUPPORTER_PRICE_USD} a year. Cancel anytime.`],
            [DollarSign, "Prices in USD", "Taxes are calculated and shown at checkout."],
          ].map(([I, t, b]) => { const Icon = I as typeof ShieldCheck; return <div key={t as string} className="pr-fact"><Icon className="size-5" /><strong>{t as string}</strong><p>{b as string}</p></div>; })}</div>
        </section>

        <section className="adx-wrap adx-faq"><h2>Questions</h2><div>{[
          ["How do I pay for an extra listing?", "Sign in, open Apply and add your startup. If you already have a listing, you pay $9.99 at a secure Dodo checkout and it is submitted for review automatically."],
          ["When do guaranteed clicks start?", "Delivery starts when your startup is approved. Your gold highlight stays on until the full pack is delivered."],
          ["What does Supporter include?", "You are listed without showing the bar on your site. You get an average member's share of the network and a gold highlight, not extra reach or leaderboard position."],
          ["Can I get a refund?", "Payments are final. If something you paid for did not appear, email hello@startupbar.co with your receipt and we will fix it at no extra cost."],
        ].map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>

        <section className="adx-end"><div className="adx-wrap"><h2>Start free today.</h2><Link to="/apply" className="pr-btn pr-btn-invert">List your startup <ArrowRight className="size-4" /></Link></div></section>
      </div>
    </DashboardLayout>
  );
}
