import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, ChevronRight, Image as ImageIcon, Mail, Sparkles, Triangle, Zap, Globe, MousePointer2 } from "lucide-react";
import studioImage from "@/assets/advertise-studio.jpg";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { BANNER_WEEKLY_CENTS } from "@/lib/banner-ads";
import { CLICK_PACKS, NEWSLETTER_PRICE_PER_FOUNDER_USD } from "@/lib/checkout-plans";

export const Route = createFileRoute("/advertise")({
  head: () => ({
    meta: [
      { title: "Advertise on StartupBar — reach founders and early adopters" },
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

const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);

function AdvertisePage() {
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
      <div className="advertise-page">
        <section className="advertise-hero">
          <img src={studioImage} width={1920} height={960} alt="Laptop and phone displaying advertising placements" className="advertise-hero-image" />
          <div className="advertise-container advertise-hero-inner">
            <div className="advertise-hero-copy">
              <p className="advertise-eyebrow">STARTUPBAR / ADVERTISE</p>
              <h1>Advertise on<br />StartupBar.</h1>
              <p className="advertise-hero-description">Your next customers are building here.<br className="hidden sm:block" /> Put your product in front of founders, makers<br className="hidden lg:block" /> and early adopters.</p>
              <div className="flex flex-wrap items-center gap-3 mt-7">
                <Button asChild size="lg" className="h-12 rounded-full"><Link to="/advertise/new">Create a campaign <ArrowRight /></Link></Button>
                <Button asChild variant="outline" size="lg" className="h-12 rounded-full"><a href="mailto:hello@startupbar.co">Talk to us</a></Button>
              </div>
              <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><Check className="size-3.5" /> Banner ads are open to every company. No listing needed.</p>
            </div>
          </div>
        </section>

        <section className="advertise-audience">
          <div className="advertise-container advertise-audience-inner">
            <div><p className="advertise-eyebrow">A COMMUNITY OF BUILDERS</p><h2>Be part of their next discovery.</h2></div>
            <dl className="advertise-stats">
              {[["Member sites", stats ? fmt(stats.sites) : "—"], ["Founders on email", stats ? fmt(stats.founders) : "—"], ["Network widget views¹", stats ? fmt(stats.views) : "—"]].map(([label, value]) => <div key={label}><dd>{value}</dd><dt>{label}</dt></div>)}
            </dl>
          </div>
          <p className="advertise-container advertise-stats-note">¹ Network-wide widget views, not banner reach. Banner campaigns report their own actual impressions and clicks.</p>
        </section>

        <section className="advertise-container advertise-formats">
          <div className="advertise-section-heading"><div><p className="advertise-eyebrow">THREE WAYS TO GET DISCOVERED</p><h2>Find your place in the network.</h2></div><p>On the page. In the bar. In the inbox.<br />Choose the placement that fits your goal.</p></div>
          <div className="advertise-product-grid">
            <article className="advertise-product">
              <div className="advertise-placement advertise-banner-preview" aria-label="Example inline banner placement">
                <div className="advertise-preview-top"><span className="font-semibold">StartupBar</span><span>Network <ChevronRight className="size-3" /></span></div>
                <PreviewRow name="Discover something new" detail="Fresh products from independent founders" icon="globe" />
                <div className="advertise-sample-banner"><span className="advertise-example-label">Example banner · Ad</span><div><Zap className="size-7" /><strong>Your next big thing.</strong></div><span>Meet your new favorite product <ArrowRight className="size-4" /></span></div>
                <PreviewRow name="Built by makers" detail="Small teams. Big ideas." icon="triangle" />
              </div>
              <div className="advertise-product-body"><div className="advertise-product-meta"><ImageIcon className="size-5" /><span>OPEN TO EVERY COMPANY</span></div><h3>Banner ads</h3><p>Stand out between startup listings on Network, Leaderboard and startup profiles. Your own desktop and mobile creatives.</p><div className="advertise-product-price"><strong>${BANNER_WEEKLY_CENTS / 100}</strong><span>/ week · one-time payment</span></div><ul><li><Check /> Choose 1–52 weeks</li><li><Check /> Time starts after approval</li><li><Check /> Actual impressions & clicks</li></ul><Button asChild className="w-full h-11 rounded-full"><Link to="/advertise/new" search={{ type: "banner" }}>Create a banner <ArrowRight /></Link></Button></div>
            </article>
            <article className="advertise-product">
              <div className="advertise-placement advertise-gold-preview" aria-label="Example gold highlight placement">
                <div className="advertise-preview-top"><span className="font-semibold">StartupBar</span><span>Leaderboard <ChevronRight className="size-3" /></span></div>
                <PreviewRow name="Made for the curious" detail="Discover independent products" icon="triangle" />
                <div className="advertise-sample-gold"><div className="advertise-sample-logo"><Sparkles className="size-5" /></div><div className="min-w-0"><span className="advertise-example-label">Example highlight</span><strong>Your startup</strong><p>A little more attention. A lot more possibility.</p></div><MousePointer2 className="size-4 shrink-0" /></div>
                <div className="advertise-mini-bar"><Sparkles className="size-3" /><b>Your startup</b><span>Featured across member sites</span><ArrowRight className="size-3" /></div>
              </div>
              <div className="advertise-product-body"><div className="advertise-product-meta"><Sparkles className="size-5" /><span>FOR LISTED STARTUPS</span></div><h3>Gold highlights</h3><p>A gold presence in the startup lists, plus priority rotation across member-site bars. Built for guaranteed, bot-filtered clicks.</p><div className="advertise-product-price"><strong>${CLICK_PACKS[0].priceUsd}</strong><span>/ {CLICK_PACKS[0].clicks} clicks · packs from</span></div><ul><li><Check /> Gold treatment in the lists</li><li><Check /> Priority in member-site bars</li><li><Check /> Runs until clicks are delivered</li></ul><Button asChild variant="outline" className="w-full h-11 rounded-full"><Link to="/advertise/new" search={{ type: "gold" }}>Get guaranteed clicks <ArrowRight /></Link></Button></div>
            </article>
            <article className="advertise-product">
              <div className="advertise-placement advertise-newsletter-preview" aria-label="Example Sunday newsletter sponsorship">
                <div className="advertise-preview-top"><span className="flex items-center gap-2"><Mail className="size-4" /> Sunday, in your inbox</span></div>
                <div className="advertise-email"><p className="font-semibold text-sm">StartupBar Weekly</p><h4>A fresh week.<br />A new discovery.</h4><div className="advertise-email-sponsor"><span className="advertise-example-label">Example sponsor</span><strong>Your product, in the spotlight.</strong><p>Meet the makers building something worth a look.</p><span>Explore the startup <ArrowRight className="size-3" /></span></div></div>
              </div>
              <div className="advertise-product-body"><div className="advertise-product-meta"><Mail className="size-5" /><span>FOR LISTED STARTUPS</span></div><h3>Sunday newsletter</h3><p>A dedicated sponsor spot in our weekly founder email. One startup per Sunday, with your story and a direct link to your product.</p><div className="advertise-product-price"><strong>${NEWSLETTER_PRICE_PER_FOUNDER_USD.toFixed(2)}</strong><span>/ founder on the list</span></div><ul><li><Check /> One sponsor per Sunday</li><li><Check /> Choose an available date</li><li><Check /> Priced from the live audience</li></ul><Button asChild variant="outline" className="w-full h-11 rounded-full"><Link to="/advertise/new" search={{ type: "newsletter" }}>Book a Sunday <ArrowRight /></Link></Button></div>
            </article>
          </div>
        </section>

        <section className="advertise-process"><div className="advertise-container"><div className="advertise-section-heading"><div><p className="advertise-eyebrow">FROM IDEA TO LIVE CAMPAIGN</p><h2>A simple start. No surprises.</h2></div></div><div className="advertise-process-grid">{[["01", "Make it yours", "Choose your placement. For banners, upload desktop and mobile images and preview your creative."], ["02", "Choose your run", "Pick 1–52 weeks for banners and pay once upfront. No subscription and no per-view charges."], ["03", "Go live after review", "We review your paid banner before it runs. Your purchased time begins on approval, not during review."], ["04", "See what happens", "Follow your dates, actual impressions and clicks. Banners share random rotation; reach is not guaranteed."]].map(([number, title, body]) => <div key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></div>)}</div></div></section>

        <section className="advertise-container advertise-faq"><div><p className="advertise-eyebrow">GOOD TO KNOW</p><h2>A few questions,<br />answered.</h2><Button asChild variant="link" className="mt-5 px-0"><a href="mailto:hello@startupbar.co">Ask us anything <ArrowRight /></a></Button></div><div>{[
          ["Do I need a listed startup?", "Not for banners — any company can advertise after signing in. Gold highlights and newsletter sponsorships are for startups listed on StartupBar."],
          ["What sizes do banners need?", "A desktop image of at least 1200 × 200 px (6:1) and a mobile image of at least 600 × 300 px (2:1). PNG, JPG or WebP, up to 5 MB."],
          ["How long will my banner run?", "Choose any whole number from 1 to 52 weeks. Each week is seven days; four weeks costs $196 and 52 weeks costs $2,548, paid once upfront. Review time does not use your purchased duration."],
          ["Are banner impressions or clicks guaranteed?", "No. Banners are time-based sponsorships in shared random rotation. Your campaign shows actual measured views and clicks. Network-wide member-site widget views are separate from banner impressions. Guaranteed clicks are available through our Gold highlight packs."],
          ["What if my banner is rejected?", "We tell you why and arrange a refund of the sponsorship payment through Dodo."],
        ].map(([question, answer]) => <details key={question}><summary>{question}<span className="advertise-faq-plus">+</span></summary><p>{answer}</p></details>)}</div></section>
        <section className="advertise-bottom"><div className="advertise-container"><div><p className="advertise-eyebrow">YOUR PRODUCT. ITS NEXT CHAPTER.</p><h2>Let’s get you discovered.</h2></div><Button asChild size="lg" className="h-12 rounded-full"><Link to="/advertise/new">Create a campaign <ArrowRight /></Link></Button></div></section>
      </div>
    </DashboardLayout>
  );
}

function PreviewRow({ name, detail, icon }: { name: string; detail: string; icon: "globe" | "triangle" }) {
  return <div className="advertise-preview-row"><div className="advertise-sample-logo">{icon === "globe" ? <Globe className="size-5" /> : <Triangle className="size-5" />}</div><div className="min-w-0"><strong>{name}</strong><p>{detail}</p></div><ChevronRight className="size-3 shrink-0" /></div>;
}
