import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — StartupBar" },
      { name: "description", content: "StartupBar pricing: your first startup listing is free forever. Additional listings are a one-time $9.99 USD payment, processed by Dodo Payments. No subscriptions, no refunds." },
      { property: "og:title", content: "Pricing — StartupBar" },
      { property: "og:description", content: "First listing free. Additional listings $9.99 one-time, processed by Dodo Payments." },
      { property: "og:url", content: "https://startupbar.co/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://startupbar.co/pricing" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "StartupBar additional startup listing",
          description: "A one-time paid listing for an additional startup in the StartupBar traffic-exchange network.",
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

function Check() {
  return <span aria-hidden className="mt-[2px] text-black">✓</span>;
}

export default function _unused() { return null; }

function PricingPage() {
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
            <Link
              to="/apply"
              className="mt-6 inline-flex h-10 items-center rounded-md bg-black px-4 text-sm font-medium text-white hover:bg-black/80 transition-colors"
            >
              Join free
            </Link>
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
            <Link
              to="/apply"
              className="mt-6 inline-flex h-10 items-center rounded-md border border-black px-4 text-sm font-medium text-black hover:bg-black hover:text-white transition-colors"
            >
              Add another startup
            </Link>
          </div>
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
            <h2 className="mb-3 text-base font-semibold text-black">Payments &amp; billing</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Payments are processed by <strong className="font-medium text-black">Dodo Payments</strong>, our merchant of record. StartupBar never sees or stores your card details.</li>
              <li>All prices are in US dollars. Applicable taxes are calculated and shown at checkout.</li>
              <li>Charges are one-time. There are no recurring subscriptions and nothing auto-renews.</li>
              <li>Your receipt is emailed by Dodo Payments and the charge appears on your statement via Dodo Payments.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-black">Refunds</h2>
            <p>
              All payments are final. Because a paid listing is delivered as soon as it is submitted for review,
              we do not offer refunds. If a payment went through but your listing did not appear, email
              {" "}<a href="mailto:hello@startupbar.co" className="text-black underline underline-offset-2">hello@startupbar.co</a>{" "}
              with your payment receipt and we will complete the listing for you at no extra cost.
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
