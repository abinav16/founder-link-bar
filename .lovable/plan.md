# Supporter tier: $1499/year listing without the widget

## The idea

Some founders want to be in the network but don't want a bar on their own site.
Today that's impossible — no widget means no impressions given, which means the
listing gets warned and eventually pulled.

New option: a **Supporter** listing. They pay $1499/year instead of showing the bar,
install a small tracking-only snippet, and get a normal spot in the rotation plus the
full dashboard (globe, visits, clicks, referrers).

## What I recommend for delivery (your open question)

This is the part that decides whether free members feel cheated, so keep it strict:

- A supporter is treated as an **exactly average contributing member** — no more.
- Free members who send more traffic than average still out-earn every supporter.
  Money buys you a seat at the table, never the best seat.
- A supporter can never be starved either: they always get the average share.
- Their own site's visits do **not** earn extra delivery. Paying replaces contributing;
  it doesn't stack on top of it.

Practically: in the existing reciprocity weighting (1x floor, 4x cap, scaled by traffic
given over 7 days), a supporter is pinned at the average-contributor weight of 2.0.
That sits in the middle: better than a dormant site, below your real traffic drivers.

Why $1499 is defensible: at today's network volume, an average member's yearly delivery
is worth well under that, so supporters are subsidising the free tier rather than
draining it. That's the story to tell publicly if anyone asks.

## What the founder gets

- Listing in the rotation on every member site, at average share.
- Public profile page, network listing, leaderboard presence.
- Full dashboard: impressions, clicks, CTR, globe, countries, referrers, visits.
- A subtle **Supporter** badge on their network card and profile page.
- No bar on their own site.

## What they don't get

- No extra delivery for buying, ever.
- No effect on featured slots or StartupBid — those stay separate products.
- No leaderboard advantage: the leaderboard still ranks on real traffic.

## Switching modes

- Free (widget) ⇄ Supporter, switchable any time from the dashboard.
- Switching to widget mode does **not** refund the paid year. The paid term keeps running
  in the background, so they can switch straight back to Supporter for the rest of it.
- When the paid year ends and they haven't installed the widget, the listing falls back
  to the normal warning flow: install the bar or pause the listing.

## The tracking snippet

Same script, new mode. It renders nothing — no bar, no layout shift, no 36px offset —
and only reports what today's widget already reports:

- anonymous pageviews (for visits and the globe)
- coarse country from IP, never stored as an IP
- device/OS/browser family
- referrer, so clicks sent back from StartupBar are attributed

## Compliance

This stays inside what StartupBar already does, which is the whole point:

- No cookies, no localStorage identifiers, no cross-site tracking, no fingerprinting.
- No names, emails, IP addresses or user IDs stored. Session id is short-lived and random.
- Data is aggregated country-level, so under GDPR/ePrivacy this is the same
  "cookie-free anonymous analytics" position you already hold — no consent banner needed
  on their site.
- Two things to add on our side: a line in the Privacy Policy covering supporter sites,
  and a short note at checkout telling the founder to mention StartupBar analytics in
  their own privacy policy. That's good practice rather than a strict requirement.
- Payment stays with Dodo Payments as merchant of record, so tax and invoicing are handled
  exactly like the $79 featured spot. Annual subscription, cancel anytime, no refunds —
  consistent with the current pricing page.

One caution: this tier only works if the supporter's site actually has traffic worth
tracking, otherwise the globe looks empty and they'll feel short-changed. Worth saying
plainly on the apply page that the snippet is for *their* stats, not for earning reach.

## Where it shows up in the product

1. **Apply page, step 1** — a third choice beside "bar at top / bar at bottom":
   "Supporter — no bar on my site ($1499/year)". Picking it swaps step 2 from the embed
   snippet to the tracking snippet and adds a Dodo checkout before submission.
2. **Dashboard** — a Mode card showing current mode, renewal date, and a switch control.
3. **Account** — cancel auto-renewal, same pattern as featured slots.
4. **Network + profile** — subtle Supporter badge.
5. **Pricing + FAQ** — a Supporter section explaining the deal and that it buys no
   extra reach.

## Technical notes

- `startups`: add `membership_mode` ('widget' | 'supporter'), `supporter_until`,
  `supporter_subscription_id`, `supporter_cancel_at_period_end`.
- `widget_pick_weights()`: return a fixed 2.0 for startups with an active supporter term;
  ignore their `impressions_given` so paying and contributing can't stack.
- Visibility enforcement (`widget_hidden_at`, `strike_count`, heartbeat warnings) skips
  startups with an active supporter term, and resumes when it lapses.
- `public/widget/loader.js`: `data-mode="track"` renders nothing and only posts the
  existing analytics beacons; new `api/public/track.pageview` style path reusing the
  current impression enrichment, but writing a visit row rather than a network impression
  (supporter sites must not appear as impression hosts).
- Checkout: new Dodo annual product, handled by the existing `dodo-webhook` route, same
  pattern as featured slots.
- `public_featured_slots`-style RPCs untouched; network/profile reads gain a
  `supporter` boolean.

## Suggested rollout

Ship it manually for the first one or two buyers (set the mode by hand, hand them the
tracking snippet) to confirm someone actually pays $1499 before building the checkout,
badge and self-serve switching. Say the word and I'll split the plan that way.
