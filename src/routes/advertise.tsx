import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Image as ImageIcon, Mail, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { BANNER_CPM_CENTS, BANNER_MIN_BUDGET_CENTS } from "@/lib/banner-ads";
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

  const products = [
    {
      icon: ImageIcon, title: "Banner ads", tag: "Open to everyone",
      body: "A wide image banner shown between startups on the Network and Leaderboard pages and on startup profiles. Separate desktop and mobile images.",
      price: `From $${BANNER_MIN_BUDGET_CENTS / 100} · $${BANNER_CPM_CENTS / 100} per 1,000 views`,
      to: "banner",
    },
    {
      icon: Sparkles, title: "Gold highlight", tag: "Listed startups",
      body: "Your startup glows gold in the lists and gets priority in the bar across every member site until all your guaranteed clicks arrive.",
      price: `From $${CLICK_PACKS[0].priceUsd} for ${CLICK_PACKS[0].clicks} clicks`,
      to: "gold",
    },
    {
      icon: Mail, title: "Sunday newsletter", tag: "Listed startups",
      body: "Be the one sponsor in our Sunday email to every founder on the network. One startup per Sunday.",
      price: `$${NEWSLETTER_PRICE_PER_FOUNDER_USD.toFixed(2)} per founder on the list`,
      to: "newsletter",
    },
  ] as const;

  return (
    <DashboardLayout>
      <section className="py-10 text-center sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Advertise</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Get in front of founders building what's next.</h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">Reach makers and early adopters across the StartupBar network. You don't need to be listed to run a banner.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/advertise/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">Start a campaign <ArrowRight className="h-4 w-4" /></Link>
          <a href="mailto:hello@startupbar.co" className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-semibold">Talk to us</a>
        </div>
        <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card">
          {[["Network views", stats ? fmt(stats.views) : "—"], ["Member sites", stats ? fmt(stats.sites) : "—"], ["Founders on email", stats ? fmt(stats.founders) : "—"]].map(([k, v]) => (
            <div key={k} className="px-3 py-5"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{v}</dd></div>
          ))}
        </dl>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {products.map((p) => (
          <div key={p.title} className="flex flex-col rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-border"><p.icon className="h-5 w-5" /></span>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">{p.tag}</span>
            </div>
            <h2 className="mt-5 text-xl font-semibold">{p.title}</h2>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.body}</p>
            <p className="mt-5 text-sm font-semibold">{p.price}</p>
            <Link to="/advertise/new" search={{ type: p.to }} className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-foreground text-sm font-semibold hover:bg-foreground hover:text-background">Start <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ))}
      </section>

      <section className="mt-16 grid gap-8 rounded-2xl border border-border bg-card p-6 md:grid-cols-2 md:p-10">
        <div>
          <h2 className="text-2xl font-semibold">How banners work</h2>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            <li><b className="text-foreground">No fixed slots.</b> All approved banners rotate at random, so many companies can run at once.</li>
            <li><b className="text-foreground">Pay for views.</b> Set a budget; each real view costs ${(BANNER_CPM_CENTS / 100000).toFixed(3)}. Bots don't count.</li>
            <li><b className="text-foreground">Reviewed first.</b> We check every banner before it goes live, usually within a day.</li>
            <li><b className="text-foreground">Ends on its own.</b> Your banner stops when the budget is used.</li>
          </ul>
        </div>
        <div className="space-y-2 rounded-xl border border-border bg-background p-4" aria-hidden>
          {[0, 1].map((i) => <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3"><div className="h-8 w-8 rounded-md bg-muted" /><div className="h-2 w-32 rounded bg-muted" /></div>)}
          <div className="grid aspect-[6/1] place-items-center rounded-lg bg-foreground text-xs font-semibold text-background">Your banner here · Ad</div>
          {[0, 1].map((i) => <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3"><div className="h-8 w-8 rounded-md bg-muted" /><div className="h-2 w-24 rounded bg-muted" /></div>)}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-2xl font-semibold">Questions</h2>
        {[
          ["Do I need a listed startup?", "Not for banners — any company can advertise. Gold highlights and the newsletter are for startups listed on StartupBar."],
          ["What sizes do banners need?", "A desktop image of at least 1200 × 200 px (6:1) and a mobile image of at least 600 × 300 px (2:1), PNG, JPG or WebP up to 5 MB."],
          ["What if my banner is rejected?", "We tell you why and refund the unused budget."],
        ].map(([q, a]) => (
          <details key={q} className="border-b border-border py-4">
            <summary className="cursor-pointer text-sm font-semibold">{q}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{a}</p>
          </details>
        ))}
      </section>
    </DashboardLayout>
  );
}
