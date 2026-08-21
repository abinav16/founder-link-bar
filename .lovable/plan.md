# StartupBid — pay-to-rank leaderboard

A standalone feature at `/startupbid`, linked from the header. Completely separate from the widget network: its own data, its own clicks, its own payments. The only connection is a small "on the StartupBar network" badge when a bid URL matches an approved member startup.

## How it works for the visitor

1. Land on `/startupbid`. A live board shows every site ranked by total dollars paid, #1 at the top.
2. The bid box at the top says "Claim #1 for $X" (current leader total + $1), with a stepper and a free-entry amount field. Minimum new entry: $5.
3. Type a URL (or @handle), pick an amount, press **Outbid** → straight to Dodo checkout. No login, no form wizard, no account step.
4. On payment success they return to the board with their new position highlighted and a share card.
5. Paying less than #1 still places them wherever that amount lands.

Bids are **cumulative**: paying again for the same URL adds to that URL's total, so returning bidders climb from where they already are. Entry ownership is keyed by normalised URL — no editing UI, exactly like outbid.lol. Site metadata (title, description, favicon) is fetched automatically from the URL after payment.

## Logged-in vs visitor

- **Visitor**: URL + amount only. Email comes from Dodo checkout. Their bid is stored with no user id.
- **Logged-in member**: above the URL field we show one-click chips of their own startups (logo + name). Tapping one prefills URL, name, logo and description. They can still type any other URL. Their bid is stamped with their user id so it appears in their account page as "Your bids".
- If a guest later signs in with the same email used at Dodo checkout, their past bids attach to the account automatically.

## Board page sections

- Sticky header bar: live "N online · M visitors" counter and the bid box.
- **Trending right now** — top movers by clicks/hour.
- **Latest activity** — feed of recent bids ("laun.ch at #172 · $13 · 1 minute ago"), animated in.
- **Ranked list** — rank, favicon, domain, total paid, description, clicks, age, and a "claim this rank for $N+1" button on each row. Tier dividers after Top 3 / Top 10 / Top 20.
- Outbound clicks are tracked and shown per entry; links open in a new tab.
- Separate `/startupbid/rules` and `/startupbid/about` panels covering pricing, no refunds, and content rules.

## Design and motion

Same monochrome + gold language as the rest of StartupBar, pushed further for this page: dark board surface, gold top-3 rows reusing the existing glass-sweep treatment, animated rank-change flips, count-up on totals, a pulse on the live activity feed, and a confetti/rank-reveal moment after a successful bid. Fully responsive, with a compact mobile board and a bottom-docked bid bar on small screens.

## Payments

Dodo one-time payments with a pay-what-you-want product so any amount ≥ the minimum can be charged. Flow:

1. Client calls a checkout endpoint with URL + amount (no auth required).
2. Server validates the URL and amount, creates a pending bid row, and returns the Dodo checkout link with the bid id in metadata.
3. Dodo webhook confirms payment → bid marked paid, amount added to the entry total, ranks recomputed, activity feed updated.
4. Return page polls the bid status for a few seconds so the rank shows even if the webhook is slow (same resilience pattern already used for Featured Spots).

No refunds; stated on the rules page and in Terms.

## Technical notes

- New tables: `bid_entries` (normalised url, display name, description, logo, total_cents, first/last bid time, optional user_id, optional matched startup_id) and `bids` (entry, amount, dodo payment id, status, email, user_id). Both get explicit GRANTs; public read is limited to a `public_bid_board()` security-definer function that exposes only safe columns — no emails.
- Clicks tracked in `bid_clicks` via a public server route with the same bot/rate guards used on widget clicks.
- New routes: `src/routes/startupbid.tsx` (board), `startupbid.rules.tsx`, `startupbid.about.tsx`, plus `src/routes/api/public/bid-checkout.ts` and `api/public/bid-webhook.ts` (signature-verified).
- Header nav gains a "StartupBid" link; sitemap and `llms.txt` updated.
- Nothing writes to `startups`, `impressions`, or `clicks` — the widget network is untouched.

## Out of scope

- Editing or deleting a bid after payment.
- Refunds or bid decay.
- StartupBid entries appearing in the widget rotation or the network leaderboard.
