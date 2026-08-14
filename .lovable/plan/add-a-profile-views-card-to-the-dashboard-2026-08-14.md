# Add a "Profile views" card to the dashboard

Add a new stat card just before the **Rank** card showing how many times a startup's public page on startupbar.co (`/startup/<slug>`) has been visited.

## Why a change is needed beyond the UI

Visits are only recorded on the StartupBar homepage today: the tracking call fires once per session on the landing page only. Nothing records a visit to a startup profile page, so today there is no data to show (only 6 stray profile-path rows exist in the whole visit log). So this needs two parts: start recording profile page visits, then display the count.

## What will be built

1. **Track profile page visits** — when someone opens `/startup/<slug>` on startupbar.co, record a visit through the existing site-visit endpoint, with the page path stored. Counted once per browser session per startup, so a visitor refreshing or bouncing around does not inflate the number. Owner visits are still counted (same as any other visitor) unless you prefer otherwise.

2. **New dashboard card** — "Profile views" appears between CTR and Rank, following the selected time range (24h / 7 days / 30 days / All time), with the same styling as the other cards. It reads its own count and shows `0` cleanly for startups with no visits yet.

3. **Backfill note** — the number starts from the moment this ships; past profile visits were never recorded and cannot be recovered.

## Technical details

- Reuse `src/routes/api/public/track/site-visit` (impressions row on the StartupBar site row, with `path` set). Add the same session-guarded `useEffect` in `src/routes/startup.$slug.tsx`, keyed by slug (`sb_visit_/startup/<slug>`), sending the canonical path.
- Add a security-definer RPC `public_startup_profile_views(_slug text, _since timestamptz)` returning a count of impressions where `shown_startup_id` is the StartupBar site row and `path` matches `/startup/<slug>` (with or without a query string), granted to `authenticated`. This avoids widening read access to the raw impressions table.
- In `src/routes/_authenticated/dashboard.tsx`, fetch the count alongside the existing range-scoped stats (loader + range-change refetch path) and render a `StatCard` with a `Eye` icon before the Rank card, so the row stays a 5-card grid at `md`+ and wraps cleanly on mobile.
