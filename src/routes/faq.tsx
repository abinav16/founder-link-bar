import { SUPPORTER_PRICE_USD, SUPPORTER_TRIAL_DAYS } from "@/lib/supporter";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FEATURED_PRICE_USD, FEATURED_DAYS, FEATURED_SLOT_COUNT } from "@/lib/featured";

type Faq = { id: string; q: string; a: string; cat: string };

const CATEGORIES = [
  "Getting started",
  "Widget & install",
  "Membership & approval",
  "Featured spots",
  "Billing",
  "Traffic & delivery",
  "Signup tracking",
  "Rules",
] as const;

const FAQS: Faq[] = [
  // Getting started
  {
    id: "what-is-startupbar",
    cat: "Getting started",
    q: "What is StartupBar?",
    a: "StartupBar is a mutual traffic-exchange network for software founders. You add a small script to your site that shows a thin bar promoting another member's startup. In return, your startup gets shown on other members' sites. Everyone in the network sends traffic and receives traffic.",
  },
  {
    id: "how-exchange-works",
    cat: "Getting started",
    q: "How does the exchange actually work?",
    a: "Every visitor to a member site loads the bar once. The bar picks a startup from the network, shows it, and logs an impression. If the visitor clicks, that click is attributed to the startup shown and the visitor lands on their site. Your own dashboard shows both what you delivered and what you received.",
  },
  {
    id: "is-it-free",
    cat: "Getting started",
    q: "Is it free?",
    a: "Yes. Your first startup listing is completely free — you only need to keep the widget installed on your site. Additional listings for the same founder are paid.",
  },
  {
    id: "supporter-tier",
    cat: "Membership & approval",
    q: "Can I be listed without showing the bar on my site?",
    a: `Yes — that's the Supporter membership: ${SUPPORTER_TRIAL_DAYS} days free, then $${SUPPORTER_PRICE_USD} per year including tax. A card is required. Cancel before the trial ends to avoid the first charge. You pay instead of contributing impressions, and you're shown across the network at an average member's share: never more than an average contributing member, never starved. Nothing is rendered on your own site. You keep your listing, profile page, leaderboard presence and dashboard, plus a subtle Supporter badge. It does not buy extra reach, featured spots or leaderboard position.`,
  },
  {
    id: "supporter-tracking-code",
    cat: "Membership & approval",
    q: "Do Supporters have to install anything?",
    a: "No. There is one optional line of analytics code that renders nothing on your page — no bar, no banner, no layout change. If you install it, your own visitor map, visits, clicks and referral attribution unlock in your dashboard. If you skip it, everything else works exactly the same; only your own on-site panels stay locked. You can add it later at any time from your account.",
  },
  {
    id: "supporter-cancel",
    cat: "Billing",
    q: "Can I cancel the Supporter membership?",
    a: "Yes, any time from your account. Cancel before your seven-day free trial ends to avoid the first charge. Access lasts until the end of the trial. After the trial, cancelling stops the next renewal; there are no refunds and your paid year keeps running until it ends. You can also switch back to the free bar at any point — install the bar snippet and your paid term simply continues in the background.",
  },
  {
    id: "how-to-join",
    cat: "Getting started",
    q: "How do I join?",
    a: "Sign in, submit your startup on the Apply page, install the widget script on your site, and wait for the listing to be reviewed. Once approved, your startup starts appearing across the network.",
  },

  // Widget & install
  {
    id: "how-to-embed",
    cat: "Widget & install",
    q: "How do I embed the widget?",
    a: 'Paste this one line just before the closing </body> tag of your site, using the startup ID shown on your Apply/Account page:\n\n<script async src="https://startupbar.co/widget/loader.js" data-startup-id="YOUR-STARTUP-ID"></script>\n\nThere is nothing else to configure. A dark variant is available by adding data-theme="dark".',
  },
  {
    id: "where-does-bar-appear",
    cat: "Widget & install",
    q: "Where does the bar appear on my site?",
    a: "It renders as a thin bar pinned to the top of the page. It automatically offsets your existing fixed headers so nothing gets covered, and when a visitor dismisses it the spacing is restored exactly.",
  },
  {
    id: "mobile-behaviour",
    cat: "Widget & install",
    q: "How does it behave on mobile?",
    a: "On small screens the bar compacts: the startup name and one-liner are shortened, branding is hidden, and links always open in a new tab so your visitor never loses your page.",
  },
  {
    id: "widget-not-showing",
    cat: "Widget & install",
    q: "I installed the script but the bar isn't showing. Why?",
    a: "The most common causes are:\n\n1. A cookie/consent tool (Termly, Cookiebot, OneTrust, CookieYes) is blocking the script. Check its configuration and your site's privacy requirements; do not bypass required consent or classify optional signup tracking as essential.\n2. A Content Security Policy that doesn't allow https://startupbar.co in script-src.\n3. The script is only placed on one page or one template instead of site-wide.\n4. The data-startup-id doesn't match your listing's ID, so the bar can't identify your site.\n5. An ad blocker on your own browser — test in a clean private window.",
  },
  {
    id: "verify-install",
    cat: "Widget & install",
    q: "How do I verify my install is working?",
    a: "Open your site in a fresh private window. If the bar renders, the install is live. The widget also sends a short heartbeat back to us, so our review process can confirm the script is loading on your domain. If your listing shows as not installed after a day, re-check the script placement and any consent blocker.",
  },
  {
    id: "must-keep-widget",
    cat: "Widget & install",
    q: "Do I have to keep the widget installed?",
    a: "Yes, unless your startup has an active Supporter membership. The widget must stay installed and visible while you participate in the free exchange. Removing it, hiding it with CSS or restricting it to a single page may make your listing ineligible. Respect legally required consent and visitor privacy choices; optional signup tracking is separate and never required to stay in the network.",
  },

  // Membership & approval
  {
    id: "free-vs-paid",
    cat: "Membership & approval",
    q: "What's the difference between the free and paid listing?",
    a: "Your first startup is free forever. If you want to list a second (or third) startup under the same account, that additional listing is a one-time paid submission. Paid listings follow the same rules and the same review process as free ones — paying does not guarantee approval.",
  },
  {
    id: "approval-time",
    cat: "Membership & approval",
    q: "How long does approval take?",
    a: "Most submissions are reviewed within 24–48 hours. You get an email as soon as your listing goes live.",
  },
  {
    id: "why-rejected",
    cat: "Membership & approval",
    q: "Why would my application be rejected?",
    a: "Usual reasons: the site isn't a real product, the widget wasn't installed, the page is a placeholder or waitlist-only, the site is monetised mainly by ads, or the content falls outside what we allow (see the rules below).",
  },
  {
    id: "allowed-sites",
    cat: "Membership & approval",
    q: "What kind of sites are allowed?",
    a: "Real, live software: SaaS products, indie apps, developer tools, micro-SaaS, and useful web tools with a working public product page. The site should be something a visitor from another founder's audience would actually find useful.",
  },
  {
    id: "not-allowed-sites",
    cat: "Membership & approval",
    q: "What kind of sites are not allowed?",
    a: "We don't accept:\n\n• Ad-monetised or ad-heavy sites\n• Link farms, directories, and sites built purely to harvest traffic\n• Adult, gambling, or crypto-pump projects\n• Scraped, spun, or AI-spam content sites\n• Sites entirely behind a login wall with no public product page\n• Parked domains, placeholder pages, and waitlist-only landing pages",
  },
  {
    id: "can-i-change-details",
    cat: "Membership & approval",
    q: "Can I change my startup name, logo, or one-liner later?",
    a: "Yes — edit your listing from your Account page. Changes go live across the network automatically.",
  },
  {
    id: "leave-network",
    cat: "Membership & approval",
    q: "How do I leave the network?",
    a: "Remove your startup from your Account page, then delete the script from your site. Your historical impression and click stats stay in the network totals.",
  },

  // Featured spots
  {
    id: "what-is-featured-spot",
    cat: "Featured spots",
    q: "What is a Featured spot?",
    a: "A Featured spot is a paid monthly placement on StartupBar pages. Your startup appears as a gold highlighted card in one of the sidebar slots on the network, leaderboard, and other StartupBar pages.",
  },
  {
    id: "featured-spot-cost",
    cat: "Featured spots",
    q: "How much does it cost and how long does it run?",
    a: `It costs $${FEATURED_PRICE_USD} USD and runs for ${FEATURED_DAYS} days. It renews automatically until you cancel.`,
  },
  {
    id: "featured-spot-where",
    cat: "Featured spots",
    q: "Where will my startup appear?",
    a: "Your startup gets a sidebar card on StartupBar pages and is highlighted in gold across the network list and leaderboard. It does not appear inside the widget on member sites.",
  },
  {
    id: "featured-spot-effect",
    cat: "Featured spots",
    q: "Does it change my widget traffic or leaderboard position?",
    a: "No. A Featured spot is presentation only. It does not change how often your startup is shown in the widget, how impressions are counted, or your leaderboard ranking.",
  },
  {
    id: "featured-spot-book-cancel",
    cat: "Featured spots",
    q: "How do I book or cancel a Featured spot?",
    a: "Click the Promote button on your startup card in the dashboard or account page, pick an open slot, and complete checkout through Dodo. You can cancel anytime from the same Promote button; the spot stays live until the end of the period you already paid for.",
  },

  // Billing
  {
    id: "payment-provider",
    cat: "Billing",
    q: "How are payments handled?",
    a: "Additional listings are paid through Dodo Payments, our merchant of record. Card details never touch our servers. You'll get a receipt by email from Dodo.",
  },
  {
    id: "no-refunds",
    cat: "Billing",
    q: "Do you offer refunds?",
    a: "No. All payments are final and non-refundable once a listing has been submitted. This includes cases where a listing is later rejected or removed for breaking the network rules, so please read the eligibility rules before paying.",
  },
  {
    id: "paid-no-listing",
    cat: "Billing",
    q: "I paid but my listing never appeared. What do I do?",
    a: "Nothing is lost. Sign back in and open the Apply page — an unused payment is detected automatically and a recovery banner lets you finish the submission. If you don't see it, email hello@startupbar.co with the email you paid with and we'll fix it manually.",
  },

  // Traffic & delivery
  {
    id: "how-impressions-delivered",
    cat: "Traffic & delivery",
    q: "How are impressions delivered?",
    a: "One bar loads per visitor session on each member site. The bar rotates to a different startup roughly every 30 seconds with a smooth fade, so a single visitor can see several startups. An impression is counted once per startup per visitor session — repeat views of the same startup in the same session are not double-counted.",
  },
  {
    id: "reciprocity",
    cat: "Traffic & delivery",
    q: "How is it decided which startups get shown?",
    a: "Delivery is reciprocity-weighted. We look at how many impressions your site has delivered to the network over the last 7 days and weight your listing accordingly — from 1x for low contributors up to 4x for the sites sending the most traffic. Send more, receive more. Sites with the widget removed drop out of rotation.",
  },
  {
    id: "analytics-mismatch",
    cat: "Traffic & delivery",
    q: "My dashboard shows more clicks than Google Analytics. Why?",
    a: "Analytics tools always count fewer sessions than raw clicks. Common reasons: ad blockers and privacy browsers block analytics but not the navigation, visitors bounce before the analytics script fires, referrers get stripped on cross-site navigation, and mobile in-app browsers behave inconsistently. A small gap is normal.",
  },
  {
    id: "non-member-sites",
    cat: "Traffic & delivery",
    q: "What shows on sites that aren't approved members?",
    a: "If a site loads the script without an approved listing (pending, rejected, or removed), it shows the StartupBar listing itself. Those views don't count as impressions or clicks for anyone in the network.",
  },
  {
    id: "how-much-traffic",
    cat: "Traffic & delivery",
    q: "How much traffic will I get?",
    a: "It depends on your own traffic and on the network's size. There's no guaranteed volume — the more visitors you send through the bar, the more visitors come back to you.",
  },

  // Signup tracking
  {
    id: "signup-tracking-setup",
    cat: "Signup tracking",
    q: "Can StartupBar track signups with my existing widget?",
    a: "Yes, optionally — without installing a second widget. The bar can see a referral click, but it cannot see an account being created inside your signup system. Open Signup tracking in your dashboard, connect your signup system using the instructions, then confirm privacy consent and save. Your developer or coding assistant must make that connection; switching it on alone does not confirm signups.",
  },
  {
    id: "signup-tracking-reports",
    cat: "Signup tracking",
    q: "What counts as a signup, and is it independently verified?",
    a: "A signed partner confirmation is a report from the destination startup's server that a genuinely new account was created. A success-page report only means someone reached a configured signup-complete page and is shown separately. A signature identifies the reporting partner; neither report is an independent audit or proof that StartupBar caused the signup. Clicks are never counted as signups, and test reports stay out of real totals.",
  },
  {
    id: "signup-tracking-pages",
    cat: "Signup tracking",
    q: "Why can't I use /dashboard or /login as my signup-complete page?",
    a: "Returning users open those pages too, so their logins and refreshes would look like new signups. The default is to connect your signup system so it reports only after creating a new account. The alternative is a dedicated completion page, such as /signup/complete, reached only after a successful new signup; visits to it are still labelled as page reports, not confirmed accounts.",
  },
  {
    id: "signup-tracking-privacy",
    cat: "Signup tracking",
    q: "What consent and privacy notice does signup tracking need?",
    a: "Connect your site's analytics consent before the widget stores or reports a referral. Browser reporting respects Global Privacy Control and Do Not Track; withdrawing consent clears the stored referral. Explain StartupBar signup attribution in your privacy notice, including the 30-day referral window, browser storage, the reports you send and how visitors can withdraw consent. Keep the private signing key on your server and do not send customer names, emails or passwords. You remain responsible for your site's applicable privacy requirements. StartupBar's Privacy Policy has the data and retention details.",
  },
  {
    id: "signup-tracking-limits",
    cat: "Signup tracking",
    q: "How long does attribution last, and can I turn it off?",
    a: "An eligible referral can be attributed for up to 30 days. Blocked storage, consent choices, different devices, other domains and expired referrals may leave signups unattributed. Turn tracking off in your dashboard to stop new attribution; this does not delete historical records. Daily cleanup removes unconverted referrals after 90 days and conversion records after 365 days; linked converted-referral records may remain until the startup is deleted. Deleting the startup deletes its attribution records. Results appear in your dashboard and weekly stats, not an email for every signup.",
  },

  // Rules
  {
    id: "no-ads",
    cat: "Rules",
    q: "Can I run ads on the pages where the widget appears?",
    a: "No. Pages carrying the StartupBar widget must be ad-free. Ad-stuffed pages send low-intent traffic to other founders and break the quality of the network.",
  },
  {
    id: "fake-traffic",
    cat: "Rules",
    q: "What happens if impressions or clicks are inflated?",
    a: "Automated traffic, bot loops, self-clicking, and scripted page reloads are detected and purged. Listings found inflating counts are removed from the network without refund.",
  },
  {
    id: "one-site-per-listing",
    cat: "Rules",
    q: "Can one listing point to multiple sites?",
    a: "No. Each listing maps to one domain, and the widget must be installed on that same domain.",
  },
  {
    id: "support",
    cat: "Rules",
    q: "How do I get help?",
    a: "Email hello@startupbar.co — questions about installs, listings, and payments all go to the same inbox.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — StartupBar" },
      {
        name: "description",
        content:
          "Answers about installing the StartupBar widget, joining the network, eligibility rules, payments and refunds, and how impressions are delivered.",
      },
      { property: "og:title", content: "FAQ — StartupBar" },
      {
        property: "og:description",
        content:
          "Widget install help, membership and eligibility rules, billing, and how impressions are delivered across the StartupBar network.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://startupbar.co/faq" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://startupbar.co/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="h-2 w-6 rounded-sm bg-black" />
      <span className="text-base font-semibold tracking-tight text-black">StartupBar</span>
    </Link>
  );
}

function FaqPage() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [open, setOpen] = useState<string[]>([]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (hash && FAQS.some((f) => f.id === hash)) {
      setOpen([hash]);
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((f) => {
      if (cat !== "All" && f.cat !== cat) return false;
      if (!q) return true;
      return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
    });
  }, [query, cat]);

  const grouped = useMemo(() => {
    return CATEGORIES.map((c) => ({ cat: c, items: filtered.filter((f) => f.cat === c) })).filter(
      (g) => g.items.length > 0,
    );
  }, [filtered]);

  const toggle = (id: string) =>
    setOpen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-black/8">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Logo />
          <Link to="/" className="text-sm text-black/40 hover:text-black transition-colors">
            ← Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1
          className="text-3xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Frequently asked questions
        </h1>
        <p className="mt-2 text-sm text-black/40">
          Everything about installing the widget, joining the network, and how traffic is shared.
        </p>

        {/* Search */}
        <div className="mt-8">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions…"
            aria-label="Search frequently asked questions"
            className="w-full rounded-lg border border-black/12 bg-white px-4 py-3 text-[15px] text-black placeholder:text-black/30 outline-none transition-colors focus:border-black/40"
          />
        </div>

        {/* Category chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(["All", ...CATEGORIES] as string[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={
                "rounded-full border px-3 py-1.5 text-xs transition-colors " +
                (cat === c
                  ? "border-black bg-black text-white"
                  : "border-black/12 text-black/55 hover:border-black/30 hover:text-black")
              }
            >
              {c}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="mt-10 space-y-10">
          {grouped.map((g) => (
            <section key={g.cat}>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/35">
                {g.cat}
              </h2>
              <div className="divide-y divide-black/8 border-y border-black/8">
                {g.items.map((f) => {
                  const isOpen = open.includes(f.id);
                  return (
                    <div key={f.id} id={f.id} className="scroll-mt-24">
                      <button
                        type="button"
                        onClick={() => toggle(f.id)}
                        aria-expanded={isOpen}
                        className="flex w-full items-start justify-between gap-4 py-4 text-left"
                      >
                        <span className="text-[15px] font-medium text-black">{f.q}</span>
                        <span
                          className={
                            "mt-1 shrink-0 text-black/30 transition-transform duration-200 " +
                            (isOpen ? "rotate-45" : "")
                          }
                          aria-hidden="true"
                        >
                          +
                        </span>
                      </button>
                      {isOpen && (
                        <div className="whitespace-pre-line pb-5 pr-8 text-[15px] leading-relaxed text-black/65">
                          {f.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {grouped.length === 0 && (
            <div className="rounded-lg border border-dashed border-black/15 px-6 py-10 text-center">
              <p className="text-[15px] text-black/60">No questions match “{query}”.</p>
              <p className="mt-2 text-sm text-black/40">
                Email{" "}
                <a
                  href="mailto:hello@startupbar.co"
                  className="text-black underline underline-offset-2"
                >
                  hello@startupbar.co
                </a>{" "}
                and we'll answer directly.
              </p>
            </div>
          )}
        </div>

        <div className="mt-14 rounded-xl border border-black/10 bg-black/[0.02] px-6 py-6">
          <p className="text-[15px] font-medium text-black">Still stuck?</p>
          <p className="mt-1 text-sm text-black/55">
            Email{" "}
            <a href="mailto:hello@startupbar.co" className="text-black underline underline-offset-2">
              hello@startupbar.co
            </a>{" "}
            or{" "}
            <Link to="/apply" className="text-black underline underline-offset-2">
              apply to the network
            </Link>
            .
          </p>
        </div>
      </main>

      <footer className="border-t border-black/8 px-6 py-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-[13px] text-black/30">
          <span>© {new Date().getFullYear()} StartupBar</span>
          <div className="flex flex-wrap items-center gap-4">
            <a href="mailto:hello@startupbar.co" className="hover:text-black transition-colors">
              Support
            </a>
            <Link to="/apply" className="hover:text-black transition-colors">
              Apply
            </Link>
            <Link to="/pricing" className="hover:text-black transition-colors">
              Pricing
            </Link>
            <Link to="/privacy" className="hover:text-black transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-black transition-colors">
              Terms of Service
            </Link>
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
