import { createFileRoute, Link } from "@tanstack/react-router";
import { FEATURED_PRICE_USD, FEATURED_DAYS, FEATURED_SLOT_COUNT } from "@/lib/featured";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — StartupBar" },
      { name: "description", content: "The rules for participating in the StartupBar traffic exchange — account responsibilities, content guidelines, and acceptable use." },
      { property: "og:title", content: "Terms of Service — StartupBar" },
      { property: "og:description", content: "The rules for participating in the StartupBar traffic exchange." },
      { property: "og:url", content: "https://startupbar.co/terms" },
    ],
    links: [{ rel: "canonical", href: "https://startupbar.co/terms" }],
  }),
  component: TermsPage,
});

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="h-2 w-6 rounded-sm bg-black" />
      <span className="text-base font-semibold tracking-tight text-black">StartupBar</span>
    </Link>
  );
}

function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-black/8">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Logo />
          <Link to="/" className="text-sm text-black/40 hover:text-black transition-colors">← Back</Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Terms of Service</h1>
        <p className="mt-2 text-sm text-black/40">Last updated: August 12, 2026</p>
        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-black/65">
          <section><h2 className="mb-3 text-base font-semibold text-black">1. Acceptance of terms</h2><p>By creating an account or using StartupBar, you agree to these Terms of Service.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">2. The service</h2><p>StartupBar is a mutual traffic-exchange network for software founders. Members embed a widget on their site that displays another member's startup. In return, their own startup is displayed on other members' sites. Taking part in the exchange is free. We also offer optional paid products: additional startup listings and a Featured spot promotion, described in section 12 and on our <Link to="/pricing" className="text-black underline underline-offset-2">Pricing</Link> page.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">3. Eligibility</h2><ul className="space-y-2 list-disc list-inside"><li>You must be 13 years of age or older.</li><li>You must be the owner or authorised representative of the startup you submit.</li><li>Your startup must have a live, publicly accessible website.</li></ul></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">4. Application &amp; approval</h2><p>All submissions are reviewed before going live. We reserve the right to approve or reject any application at our sole discretion.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">5. Widget obligation</h2><p>By joining, you agree to keep the StartupBar embed script active on your site while your startup is in the network. Removing the widget while still receiving impressions from other members violates these terms.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">6. Acceptable use</h2><p>You may not submit content promoting illegal products, adult content, gambling, hate speech, spam, or anything violating Google's or Apple's developer policies. Artificially inflating impression or click counts is grounds for immediate removal.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">7. Intellectual property</h2><p>You retain ownership of your startup name, logo, and description. By submitting them, you grant StartupBar a non-exclusive, royalty-free licence to display them within the network, on StartupBar pages, and in featured placements you purchase.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">8. No warranties</h2><p>The Service is provided "as is". We do not guarantee a specific volume of impressions, clicks, visits, signups, or revenue, for free listings or for paid featured placements.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">9. Limitation of liability</h2><p>To the maximum extent permitted by law, StartupBar shall not be liable for any indirect, incidental, or consequential damages. Where liability cannot be excluded, it is limited to the amount you paid us in the twelve months before the claim.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">10. Termination</h2><p>You may remove your startup at any time from your <Link to="/account" className="text-black underline underline-offset-2">Account</Link> page. To close your account entirely, email <a href="mailto:hello@startupbar.co" className="text-black underline underline-offset-2">hello@startupbar.co</a> and we'll delete it for you. If we remove a startup for a breach of these terms, any active featured subscription for that startup is cancelled without refund.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">11. Paid listings</h2><p>Your first startup listing is free. Each additional listing on the same account is a one-time payment of $9.99 USD, charged before the listing is submitted for review. Payment does not guarantee approval; if we reject a paid listing on grounds other than a breach of these terms, we will apply the payment to a replacement listing.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">12. Featured spot promotion</h2><ul className="space-y-2 list-disc list-inside"><li>A Featured spot is an optional paid promotion that costs ${FEATURED_PRICE_USD} USD and renews automatically every {FEATURED_DAYS} days until cancelled.</li><li>There are {FEATURED_SLOT_COUNT} spots in total. Spots are booked on a first come, first served basis and one account may hold one active featured subscription at a time.</li><li>A featured startup appears as a sidebar card on StartupBar pages and is highlighted in the network list and leaderboard for the paid period.</li><li>A featured spot affects presentation on StartupBar pages only. It does not change widget delivery on member sites, reciprocity weighting, leaderboard position, or recorded impression and click counts.</li><li>Your startup must be approved and remain compliant with these terms for the spot to stay live.</li><li>You may cancel at any time from your dashboard or Account page. Cancellation stops the next renewal; the spot stays live until the end of the period already paid for.</li><li>We may end a featured spot early and refund the unused period on a pro rata basis if we need to remove the placement for legal, security, or policy reasons.</li><li>We may change featured pricing, the number of spots, or where featured cards appear. Changes apply from your next renewal.</li></ul></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">13. Billing &amp; refunds</h2><p>Payments are processed by Dodo Payments, our merchant of record. Prices are in US dollars and applicable taxes are shown at checkout. Payments are final and we do not offer refunds, except where stated in section 12 or required by law. Full details are on the <Link to="/pricing" className="text-black underline underline-offset-2">Pricing</Link> page.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">14. Changes to these terms</h2><p>We may update these terms at any time. Continued use constitutes acceptance.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">15. Contact</h2><p>Questions? Email <a href="mailto:hello@startupbar.co" className="text-black underline underline-offset-2">hello@startupbar.co</a>.</p></section>

        </div>
      </main>
      <footer className="border-t border-black/8 px-6 py-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-black/30">
          <span>© {new Date().getFullYear()} StartupBar</span>
          <div className="flex flex-wrap items-center gap-4">
            <a href="mailto:hello@startupbar.co" className="hover:text-black transition-colors">Support</a>
            <Link to="/pricing" className="hover:text-black transition-colors">Pricing</Link>
            <Link to="/faq" className="hover:text-black transition-colors">FAQ</Link>
            <Link to="/startupbid" className="hover:text-black transition-colors">StartupBid</Link>

            <Link to="/privacy" className="hover:text-black transition-colors">Privacy Policy</Link>
            <a
              href="https://x.com/danielabinav16"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
              className="hover:text-black transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
