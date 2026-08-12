import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FEATURED_PRICE_USD, FEATURED_DAYS, FEATURED_SLOT_COUNT } from "@/lib/featured";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — StartupBar" },
      { name: "description", content: "StartupBar pricing: first startup listing free forever, extra listings $9.99 one-time, and Featured spot promotion at $79 per month. Payments processed by Dodo Payments." },
      { property: "og:title", content: "Pricing — StartupBar" },
      { property: "og:description", content: "First listing free. Extra listings $9.99 one-time. Featured spot promotion $79 per month, cancel anytime." },
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
          name: "StartupBar listings and Featured spot promotion",
          description: "Startup listings in the StartupBar traffic exchange network, plus a paid Featured spot promotion on StartupBar pages.",
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
              name: "Featured spot promotion",
              price: String(FEATURED_PRICE_USD),
              priceCurrency: "USD",
              url: "https://startupbar.co/pricing",
              availability: "https://schema.org/InStock",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: String(FEATURED_PRICE_USD),
                priceCurrency: "USD",
                billingDuration: FEATURED_DAYS,
                billingIncrement: 1,
                unitCode: "DAY",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: PricingPage,
});


function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="h-2 w-6 rounded-sm bg-black" />
      <span className="text-base font-semibold tracking-tight text-black">StartupBar</span>
    </Link>
  );
}

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

function Check() {
  return <span aria-hidden className="mt-[2px] text-black">✓</span>;
}

function PricingPage() {
  const { loading, signedIn, listings } = useMembership();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-black/8">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Logo />
          <Link to="/" className="text-sm text-black/40 hover:text-black transition-colors">← Back</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Pricing</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-black/60">
          StartupBar is a mutual traffic exchange for software founders. Your first startup listing is free
          forever. If you want to list more than one startup, each extra listing is a one-time payment.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-black/10 p-6">
            <div className="text-xs font-medium uppercase tracking-wide text-black/40">First listing</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight text-black">$0</span>
              <span className="text-sm text-black/40">/ forever</span>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-black/65">
              <li className="flex gap-2"><Check />One startup listed in the network</li>
              <li className="flex gap-2"><Check />Your bar shown on every member site</li>
              <li className="flex gap-2"><Check />Public startup profile page</li>
              <li className="flex gap-2"><Check />Impression &amp; click dashboard</li>
              <li className="flex gap-2"><Check />Leaderboard and network listing</li>
            </ul>
            {loading ? (
              <div aria-hidden className="mt-6 h-10 w-36 rounded-md bg-black/5" />
            ) : !signedIn ? (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to="/apply"
                  className="inline-flex h-10 items-center rounded-md bg-black px-4 text-sm font-medium text-white hover:bg-black/80 transition-colors"
                >
                  Join free
                </Link>
                <Link to="/auth" className="text-sm text-black/45 hover:text-black transition-colors">
                  Already a member? Sign in
                </Link>
              </div>
            ) : listings > 0 ? (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex h-10 items-center rounded-md bg-black/5 px-4 text-sm font-medium text-black/50">
                  Free listing active
                </span>
                <Link to="/dashboard" className="text-sm text-black/45 hover:text-black transition-colors">
                  View dashboard
                </Link>
              </div>
            ) : (
              <Link
                to="/apply"
                className="mt-6 inline-flex h-10 items-center rounded-md bg-black px-4 text-sm font-medium text-white hover:bg-black/80 transition-colors"
              >
                List your startup free
              </Link>
            )}
          </div>

          <div className="rounded-xl border-2 border-black p-6">
            <div className="text-xs font-medium uppercase tracking-wide text-black/40">Additional listing</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight text-black">$9.99</span>
              <span className="text-sm text-black/40">USD, one-time</span>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-black/65">
              <li className="flex gap-2"><Check />Everything in the free listing</li>
              <li className="flex gap-2"><Check />One extra startup on the same account</li>
              <li className="flex gap-2"><Check />Charged once per extra listing — no subscription</li>
              <li className="flex gap-2"><Check />Reviewed before it goes live</li>
            </ul>
            {loading ? (
              <div aria-hidden className="mt-6 h-10 w-44 rounded-md bg-black/5" />
            ) : !signedIn ? (
              <div className="mt-6">
                <Link
                  to="/auth"
                  className="inline-flex h-10 items-center rounded-md border border-black px-4 text-sm font-medium text-black hover:bg-black hover:text-white transition-colors"
                >
                  Sign in to add another
                </Link>
                <p className="mt-2 text-xs text-black/40">
                  Extra listings are added from your account, after your first startup is listed.
                </p>
              </div>
            ) : listings === 0 ? (
              <div className="mt-6">
                <span className="inline-flex h-10 items-center rounded-md bg-black/5 px-4 text-sm font-medium text-black/50">
                  List your first startup first
                </span>
                <p className="mt-2 text-xs text-black/40">
                  Your first listing is free — paid listings unlock once it&rsquo;s submitted.
                </p>
              </div>
            ) : (
              <Link
                to="/apply"
                className="mt-6 inline-flex h-10 items-center rounded-md border border-black px-4 text-sm font-medium text-black hover:bg-black hover:text-white transition-colors"
              >
                Add another startup — $9.99
              </Link>
            )}
          </div>
        </div>

        {/* Featured spot promotion */}
        <div className="mt-4 rounded-xl border border-black/10 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-black/40">Featured spot promotion</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-black">${FEATURED_PRICE_USD}</span>
                <span className="text-sm text-black/40">USD per month, cancel anytime</span>
              </div>
            </div>
            {loading ? (
              <div aria-hidden className="h-10 w-40 rounded-md bg-black/5" />
            ) : !signedIn ? (
              <Link
                to="/auth"
                className="inline-flex h-10 items-center rounded-md border border-black px-4 text-sm font-medium text-black hover:bg-black hover:text-white transition-colors"
              >
                Sign in to promote
              </Link>
            ) : (
              <Link
                to="/network"
                className="inline-flex h-10 items-center rounded-md bg-black px-4 text-sm font-medium text-white hover:bg-black/80 transition-colors"
              >
                Book a featured spot
              </Link>
            )}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-black/60">
            Featured spots are an optional promotion on StartupBar&rsquo;s own pages. There are{" "}
            {FEATURED_SLOT_COUNT} spots in total, shown in the sidebar rails beside the network feed. Booking
            a spot does not change how the widget rotates startups on member sites, and it never buys extra
            impressions inside the network.
          </p>
          <ul className="mt-5 grid gap-2 text-sm text-black/65 sm:grid-cols-2">
            <li className="flex gap-2"><Check />A dedicated card in the StartupBar sidebar with your logo, name, founder and one liner</li>
            <li className="flex gap-2"><Check />Gold highlight on your card in the network list, Trending and New this week</li>
            <li className="flex gap-2"><Check />Gold highlight on the leaderboard, including the top podium if you rank there</li>
            <li className="flex gap-2"><Check />Renews every {FEATURED_DAYS} days until you cancel</li>
          </ul>
        </div>

        <div className="mt-14 space-y-8 text-[15px] leading-relaxed text-black/65">

          <section>
            <h2 className="mb-3 text-base font-semibold text-black">How to purchase</h2>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Create a StartupBar account (or sign in) and open the <Link to="/apply" className="text-black underline underline-offset-2">Apply</Link> page.</li>
              <li>Enter your startup name, website, one-line description and founder note, and install the widget snippet on your site.</li>
              <li>Your first listing submits for free. If you already have a listing, the button becomes “Pay $9.99 &amp; submit”.</li>
              <li>You are taken to a secure Dodo Payments checkout to pay by card.</li>
              <li>After payment you return to StartupBar and the listing is submitted automatically for review.</li>
            </ol>
            <p className="mt-3">
              The paid checkout only appears for an account's second and later listings, so it is reachable after
              sign-in on the Apply page. Everything on this page describes the same prices and terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-black">How to book a featured spot</h2>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Sign in and open the <Link to="/network" className="text-black underline underline-offset-2">Network</Link> page or your <Link to="/dashboard" className="text-black underline underline-offset-2">Dashboard</Link>.</li>
              <li>Press Promote on the startup you want to feature. Your startup must already be approved.</li>
              <li>Pick one of the {FEATURED_SLOT_COUNT} spots that is still open.</li>
              <li>You are taken to a secure Dodo Payments checkout for the ${FEATURED_PRICE_USD} monthly subscription.</li>
              <li>After payment you return to StartupBar and the spot goes live within a minute.</li>
            </ol>
            <p className="mt-3">
              Each account can hold one active featured subscription at a time. To move to a different spot,
              cancel the current one first and book again once it ends.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-black">Payments &amp; billing</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Payments are processed by <strong className="font-medium text-black">Dodo Payments</strong>, our merchant of record. StartupBar never sees or stores your card details.</li>
              <li>All prices are in US dollars. Applicable taxes are calculated and shown at checkout.</li>
              <li>Listing payments are one-time and never auto renew.</li>
              <li>The featured spot is a subscription. It renews automatically every {FEATURED_DAYS} days at ${FEATURED_PRICE_USD} until you cancel.</li>
              <li>Your receipt is emailed by Dodo Payments and the charge appears on your statement via Dodo Payments.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-black">Cancelling a featured spot</h2>
            <p>
              You can cancel from the Promote panel on your dashboard, or from the startup card on your{" "}
              <Link to="/account" className="text-black underline underline-offset-2">Account</Link> page.
              Cancelling turns off auto renewal immediately. Your spot stays live and highlighted until the end
              of the period you already paid for, then it is released back to the pool. There are no partial
              period refunds.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-black">Refunds</h2>
            <p>
              All payments are final. Because a paid listing is delivered as soon as it is submitted for review,
              and a featured spot goes live immediately after checkout, we do not offer refunds. If a payment
              went through but your listing or featured spot did not appear, email
              {" "}<a href="mailto:hello@startupbar.co" className="text-black underline underline-offset-2">hello@startupbar.co</a>{" "}
              with your payment receipt and we will fix it for you at no extra cost.
            </p>
          </section>


          <section>
            <h2 className="mb-3 text-base font-semibold text-black">What you get for the money</h2>
            <p>
              A listing places your startup in the rotation shown by the StartupBar widget across every member
              site. Delivery is reciprocity-weighted: the more impressions your site delivers to the network,
              the more your startup receives back. Listings must keep the widget visible on their site to stay
              in the network. See the <Link to="/faq" className="text-black underline underline-offset-2">FAQ</Link>
              {" "}for eligibility rules and delivery details.
            </p>
            <p className="mt-3">
              A featured spot is separate. It buys visibility on StartupBar pages only: a sidebar card plus a
              gold highlight on the network list and leaderboard. It does not affect widget delivery,
              reciprocity weighting, leaderboard ranking, or the impression and click numbers you earn.
            </p>
          </section>


          <section>
            <h2 className="mb-3 text-base font-semibold text-black">Questions</h2>
            <p>
              Email <a href="mailto:hello@startupbar.co" className="text-black underline underline-offset-2">hello@startupbar.co</a>.
              See also our <Link to="/terms" className="text-black underline underline-offset-2">Terms</Link> and{" "}
              <Link to="/privacy" className="text-black underline underline-offset-2">Privacy Policy</Link>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-black/8 px-6 py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-black/30">
          <span>© {new Date().getFullYear()} StartupBar</span>
          <div className="flex flex-wrap items-center gap-4">
            <a href="mailto:hello@startupbar.co" className="hover:text-black transition-colors">Support</a>
            <Link to="/faq" className="hover:text-black transition-colors">FAQ</Link>
            <Link to="/terms" className="hover:text-black transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-black transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
