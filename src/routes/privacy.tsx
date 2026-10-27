import { SiteHeader } from "@/components/SiteHeader";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
      { title: "Privacy Policy — StartupBar" },
      { name: "description", content: "How StartupBar collects, uses, and protects data from founders and visitors who interact with the traffic exchange widget." },
      { property: "og:title", content: "Privacy Policy — StartupBar" },
      { property: "og:description", content: "How StartupBar collects, uses, and protects founder and visitor data." },
      { property: "og:url", content: "https://startupbar.co/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="h-2 w-6 rounded-sm bg-black" />
      <span className="text-base font-semibold tracking-tight text-black">StartupBar</span>
    </Link>
  );
}

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Privacy Policy</h1>
        <p className="mt-2 text-sm text-black/40">Last updated: October 27, 2026</p>
        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-black/65">
          <section><h2 className="mb-3 text-base font-semibold text-black">1. Who we are</h2><p>StartupBar ("we", "us", "our") operates startupbar.co — a traffic-exchange network for software founders, with optional paid listings and featured placements. Contact us at <a href="mailto:hello@startupbar.co" className="text-black underline underline-offset-2">hello@startupbar.co</a> with any privacy-related questions.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">2. Information we collect</h2><ul className="space-y-2 list-disc list-inside"><li><strong className="text-black/80">Account data:</strong> When you sign up via Google OAuth we receive your name, email address, and Google profile picture. We store your name, email, and the profile photo you choose to show on your startup profile.</li><li><strong className="text-black/80">Startup data:</strong> The startup name, URL, logo, one-liner and founder note you submit during the application process.</li><li><strong className="text-black/80">Analytics events:</strong> Anonymous impression and click events. No personal visitor data is stored.</li><li><strong className="text-black/80">Purchase data:</strong> For paid listings and featured spot subscriptions we store the payment reference returned by our payment provider, the amount status, the slot you booked, and the start, renewal and cancellation dates. We never receive or store your card number.</li><li><strong className="text-black/80">StartupBid data:</strong> When you place a bid on <a href="/startupbid" className="text-black underline underline-offset-2">StartupBid</a> we store the website or handle you submitted, its publicly available name, icon and description fetched from that site, the amount paid, the payment reference, and anonymous click counts for the entry. You can bid without an account; if you are signed in we link the bid to your account so you can manage it.</li></ul></section>
          <section id="google-user-data"><h2 className="mb-3 text-base font-semibold text-black">3. Google user data</h2>
            <p>StartupBar uses Google Sign-In (OAuth 2.0), including Google One Tap, so founders can create and access their StartupBar account. This section explains exactly how StartupBar accesses, uses, stores, shares, protects and deletes Google user data.</p>
            <h3 className="mt-4 mb-2 text-[15px] font-semibold text-black/80">Data we access</h3>
            <p>We request only the <code>openid</code>, <code>email</code> and <code>profile</code> scopes. From Google we receive your Google account ID, email address, name and profile photo URL. We do not access your Gmail, Drive, Calendar, Contacts or any other Google service or data.</p>
            <h3 className="mt-4 mb-2 text-[15px] font-semibold text-black/80">How we use it</h3>
            <ul className="space-y-2 list-disc list-inside"><li>To sign you in and keep your account secure.</li><li>To show your name and photo on your dashboard and, if you choose, on your public startup profile.</li><li>To send essential account, application and billing emails to your address.</li></ul>
            <p className="mt-3">We use Google user data only to provide and improve user-facing features of StartupBar. We do not use it for advertising (targeted, personalised, retargeted or interest-based), credit or lending decisions, or to build databases for other purposes. We do not use Google user data to develop, improve or train generalised or non-personalised AI or machine-learning models.</p>
            <h3 className="mt-4 mb-2 text-[15px] font-semibold text-black/80">Sharing and transfer</h3>
            <p>We do not sell Google user data and do not transfer or disclose it to third parties, data brokers or information resellers. It is processed only by service providers that help us run StartupBar (our secure hosting and database provider and our email delivery provider), under contract and only to provide the service, or where required by law.</p>
            <h3 className="mt-4 mb-2 text-[15px] font-semibold text-black/80">How we protect it</h3>
            <p>All data is encrypted in transit (HTTPS/TLS) and at rest. Access is restricted by row-level security so each founder can only access their own account data, and administrative access is limited to authorised staff.</p>
            <h3 className="mt-4 mb-2 text-[15px] font-semibold text-black/80">Retention and deletion</h3>
            <p>We keep Google user data only while your account is active. You can delete your account and data at any time from your dashboard settings, or by emailing <a href="mailto:hello@startupbar.co" className="text-black underline underline-offset-2">hello@startupbar.co</a> from your account email. We delete your account data within 30 days of the request, except records we must keep by law (such as payment records). You can also revoke StartupBar's access at any time via <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-black underline underline-offset-2">Google Account Permissions</a>.</p>
            <p className="mt-3">StartupBar's use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-black underline underline-offset-2">Google API Services User Data Policy</a>, including the Limited Use requirements. If we change how we use Google user data, we will update this policy and notify you by email.</p>
          </section>
          <section><h2 className="mb-3 text-base font-semibold text-black">4. How we use your data</h2><ul className="space-y-2 list-disc list-inside"><li>To authenticate you and maintain your account session.</li><li>To display your startup in the StartupBar network and, if you buy a featured spot, in the featured card on StartupBar pages.</li><li>To power your dashboard analytics.</li><li>To take payment, fulfil paid listings and featured subscriptions, handle renewals and cancellations, and keep records for tax and accounting.</li><li>To send essential product and billing emails, such as payment confirmations, renewal notices and expiry reminders. We do not send marketing emails without your consent.</li></ul></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">5. Data sharing</h2><p>We do not sell, rent, or trade your personal data. We share data only with the processors we need to run the service: Supabase (database and authentication), Google (OAuth sign-in), Resend (transactional email) and <a href="https://dodopayments.com" target="_blank" rel="noopener noreferrer" className="text-black underline underline-offset-2">Dodo Payments</a>, our merchant of record for all paid listings and featured subscriptions. When you check out, Dodo Payments collects your billing details and card data directly and processes them under their own privacy policy.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">6. Public information</h2><p>Your startup name, logo, website, one-liner, founder name and founder photo are shown publicly on the network, leaderboard, your startup profile page, and in any featured card you purchase. StartupBid entries — the site or handle, its name, icon, description, total amount bid and click count — are shown publicly on the StartupBid board; the email or account behind a bid is never shown. Links from the StartupBid board carry StartupBar attribution parameters (utm_source, utm_medium and a referral tag) so the destination site can see the traffic came from us. Do not submit anything you do not want shown publicly.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">7. Supporter analytics script</h2><p>Startups on a Supporter membership may place an optional StartupBar analytics script on their own website. It renders nothing to visitors. It records an anonymous pageview with the page URL, the referring source and a country derived from the IP address, which is not stored. It sets no cookies, stores no identifier in the browser, does not fingerprint devices and does not track visitors across sites. The resulting statistics are aggregated and visible only to that startup&rsquo;s owner in their dashboard. If you install it, mention StartupBar analytics in your own site&rsquo;s privacy notice.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">8. Cookies and optional signup attribution</h2><p>We use a session cookie to keep you signed in. The embedded widget does not set tracking cookies on partner websites. Optional signup attribution uses the existing widget without another widget installation, but requires the partner to connect its signup system or configure a dedicated signup-complete page. Switching tracking on alone does not let us see accounts created inside the partner's system.</p><p className="mt-3">A StartupBar referral link may include an opaque referral token. Only after the partner signals analytics consent does the widget retain that token in first-party browser storage (localStorage) for up to 30 days. Browser storage and reporting respect Global Privacy Control and Do Not Track. Withdrawing consent clears the referral from that browser and stops browser reports; it does not automatically delete reports already received by StartupBar. Partners must connect consent handling and explain this use in their own privacy notices.</p><p className="mt-3">When an eligible referral reaches the configured signup-complete page, the browser can report that page visit. The default signup-system connection instead sends a signed partner-server report after a genuinely new account is created. Signed server reports are not technically gated by the widget's browser-consent signal; partners are responsible for the applicable lawful basis, any required consent and respecting visitors' choices in their own systems. Returning logins, dashboard visits, refreshes, purchases and failed signups must not be reported as new accounts.</p><p className="mt-3">We show success-page reports separately from signed partner-server confirmations. A signature identifies the reporting partner, not an independently audited account. Neither report proves that StartupBar caused a signup, and clicks are not signups. Test reports are excluded from real totals. Reports help show referral performance in the startup owner's dashboard and weekly statistics.</p><p className="mt-3">We do not request customer names, emails, passwords or customer account details. We store hashes of referral tokens and server event IDs, linked to the destination startup, the referring startup where available, report type, timestamps and test status. These are pseudonymous attribution records, not completely unlinked anonymous events. Partners must keep private signing keys on their servers.</p><p className="mt-3">The attribution window is 30 days, not the retention period for server records. Unconverted referrals are removed by daily cleanup after 90 days, and conversion records after 365 days. Linked converted-referral records may remain after their conversion record is removed, until the startup is deleted. Deleting a startup deletes its attribution records. Disabling tracking stops new attribution but does not delete historical records. For privacy or deletion requests, contact <a href="mailto:hello@startupbar.co" className="text-black underline underline-offset-2">hello@startupbar.co</a>. Data held by the partner is governed by that partner's privacy notice; contact the partner for requests about its records.</p><p className="mt-3">Cross-device journeys, blocked storage, consent choices, other domains and conversions beyond 30 days may remain unattributed. Counts may differ from a partner's analytics. Participation in signup tracking is optional and is not a condition of network membership. See our <Link to="/terms" className="text-black underline underline-offset-2">Terms of Service</Link> for reporting responsibilities and our <Link to="/faq" className="text-black underline underline-offset-2">FAQ</Link> for setup questions.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">9. Data retention &amp; deletion</h2><p>You can delete any of your startups at any time from your <Link to="/account" className="text-black underline underline-offset-2">Account</Link> page. You can also permanently delete your whole account yourself from Account, under Profile. Deleting your account removes your listings, profile and analytics, signs you out everywhere, and permanently removes your address from every mailing list. You can still email <a href="mailto:hello@startupbar.co" className="text-black underline underline-offset-2">hello@startupbar.co</a> if you would rather we do it for you. Payment and subscription records are kept for as long as tax and accounting law requires, even after an account is deleted.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">10. Email preferences</h2><p>Every non essential email we send carries a one click unsubscribe link and the matching one click unsubscribe header supported by Gmail and Apple Mail. Unsubscribing takes effect immediately and applies to every future update, including the weekly digest. Addresses that permanently bounce or report a message as spam are added to our suppression list automatically and are never mailed again. Essential account emails, such as approvals, warnings, payment receipts and renewal notices, are still sent while your account exists.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">11. Security</h2><p>All data is transmitted over HTTPS. Authentication tokens are managed by Supabase Auth. We do not store passwords or card details.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">12. Children</h2><p>StartupBar is not directed at children under 13.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">13. Changes to this policy</h2><p>We will notify you of material changes by posting the updated policy here with a new date.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">14. Contact</h2><p>Questions? Email <a href="mailto:hello@startupbar.co" className="text-black underline underline-offset-2">hello@startupbar.co</a>.</p></section>

        </div>
      </main>
      <footer className="border-t border-black/8 px-6 py-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-[13px] text-black/30">
          <span>© {new Date().getFullYear()} StartupBar</span>
          <div className="flex flex-wrap items-center gap-4">
            <a href="mailto:hello@startupbar.co" className="hover:text-black transition-colors">Support</a>
            <Link to="/pricing" className="hover:text-black transition-colors">Pricing</Link>
            <Link to="/faq" className="hover:text-black transition-colors">FAQ</Link>
            <Link to="/startupbid" className="hover:text-black transition-colors">StartupBid</Link>

            <Link to="/terms" className="hover:text-black transition-colors">Terms of Service</Link>
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
