# Plan — P0 → P2 UX upgrades

## P0.1 Leaderboard timeframe toggle (pure frontend)
File: `src/routes/leaderboard.tsx`

- Add a second pill group next to the existing Most Seen / Top Contributors tabs: **Today · This week · All-time** (default All-time, so nothing changes for existing users on first paint).
- Derive the metric per row from data the loader already returns (`dailyImpressions[]`, `dailyGiven[]`, 7 buckets, index 6 = today):
  - Today → last bucket
  - This week → sum of all 7 buckets
  - All-time → `impressions` / `impressions_given` (current behavior)
- Re-sort podium + list by that metric (clicks/CTR columns stay lifetime and get a small "all-time" caption when a windowed range is active, so nothing is misread).
- Sparkline stays 7-day. Subtitle copy updates per range ("Ranked by impressions received today", etc.).
- Empty case: if every row is 0 for the window, show "No activity yet today — check back after the 5:30 AM IST reset."

## P0.2 Network directory sort + empty state
Files: `src/routes/network.tsx`, `src/lib/network-dashboard.functions.ts`

- Add a sort dropdown/pill row beside the search box on **Startups in Network**: **Newest · Trending · Most clicks · Most impressions**.
  - Newest = `created_at` desc (current default)
  - Trending = `clicks_24h`, tiebreak `impressions_24h`
  - Most clicks / Most impressions = lifetime totals
- Lifetime totals aren't in the network payload today (cards only carry 24h numbers). Fix by calling the existing `public_startup_totals` RPC in the network loader and adding `impressions` / `clicks` to `StartupCard`. No migration, no schema change.
- Empty state: keep the "No startups match "{query}"" copy, add a **Clear search** button that resets query and sort, plus a hint line.
- Sorting/filtering stays client-side over the loaded set.

## P1 Dashboard time-range toggle (24h / 7d / 30d)
File: `src/routes/_authenticated/dashboard.tsx`

- Add a 24h / 7d / 30d pill group above the chart, controlling both the chart and the two stat cards (impressions / clicks) for that window. Lifetime totals stay visible as a secondary line so founders don't lose the big number.
- **No migration needed**: the dashboard already counts `impressions` / `clicks` directly with `count: "exact"`. Add `.gte("created_at", since)` for the selected window and fetch the daily rows for the widest range (30d) once, then bucket client-side (24 hourly buckets for 24h, 7 / 30 day buckets otherwise). Switching ranges is instant, no refetch.
- Sparkline gets range-aware labels (hours for 24h, weekday for 7d, date ticks every 5 days for 30d).

## P2 Static "How it works"
File: `src/routes/index.tsx`

- Replace the auto-rotating slide stack (4s interval, dots) with three always-visible numbered steps in a responsive 3-column grid (stacked on mobile), reusing the existing slide headlines, bullets, visuals and CTA.
- Removes the timer, `active`/`animating` state and dot controls; keeps the `#how` anchor id so nav links still work.

## Technical notes
- Only `src/routes/leaderboard.tsx`, `src/routes/network.tsx`, `src/lib/network-dashboard.functions.ts`, `src/routes/_authenticated/dashboard.tsx`, `src/routes/index.tsx` change. No SQL migrations, no RLS changes, no new tables.
- All new controls use the existing black/white pill styling already used for the leaderboard tabs — consistent look, no new design system tokens.
- Verification after build: load `/leaderboard`, `/network`, `/dashboard` and `/` in a headless browser, exercise each toggle, and confirm zero console errors plus correct re-ordering.
