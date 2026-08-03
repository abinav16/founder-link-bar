# Fix the falling click-through rate

## What's actually happening

Clicks per day have stayed roughly flat (20-70/day) while impressions exploded — from ~1,200/day in mid-July to 3,400-6,300/day now. CTR fell from 7-9% to 0.4-0.8% purely because the denominator grew, not because people stopped clicking.

The cause is how impressions are counted: every single pageview on every host site logs a new impression row. One visitor browsing 12 pages on a member site generates 12 impressions, and often the *same* startup is shown to them repeatedly. Those repeats can never realistically produce 12 clicks, so CTR mathematically collapses as member sites get more traffic.

## The change

Count one impression per visitor, per shown startup, per session.

- The widget gets a per-browser session identifier (kept in `sessionStorage`, no cookies, no personal data).
- The pick endpoint records an impression only the first time a given session sees a given startup. Repeat views in the same session still show the bar, they just don't inflate the count.
- A visitor who sees five different startups across a session still generates five impressions — real reach is preserved.

## What founders will see

- Impression totals across the dashboard, leaderboard, network page and weekly digest will get smaller. They'll be truthful reach numbers instead of pageview counts.
- CTR should immediately read in a believable range (rough estimate: several percent rather than under 1%).
- Historical rows stay untouched, so there will be a visible step-change in the charts on the day this ships. Worth a one-line note in the next weekly digest so nobody thinks their traffic dropped.

## Technical notes

- `public/widget/loader.js`: generate/persist a session id and pass it to the pick call.
- `src/routes/api/public/widget.pick.ts`: skip the `impressions` insert when a row already exists for that session id + shown startup; still return the pick and still serve the bar.
- Requires a nullable `session_id` column on `impressions` plus an index on `(session_id, shown_startup_id, created_at)` for the dedupe lookup.
- Reciprocity weighting in `widget_pick_weights()` is contribution-based on impressions given; it keeps working, just on the deduped counts.
- No changes to the bar's look, copy, rotation or CTA, per your call.
