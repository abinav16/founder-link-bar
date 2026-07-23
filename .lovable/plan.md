Problem
-------
The founder dashboard (`/_authenticated/dashboard`) passes `devSimulate` to `LiveVisitorMap`, which renders a "Simulate random visitor" button. Each click inserts a real row into `public.impressions` with `referrer = 'dev-simulate'`. Those rows are currently counted by every leaderboard and dashboard aggregation function, so founders can inflate impressions/clicks and rank higher. The Reddit commenter claims they did exactly this for two days.

Plan
----
1. Remove the simulate button from founder dashboards
   - Edit `src/routes/_authenticated/dashboard.tsx` to stop passing `devSimulate` to `LiveVisitorMap`.
   - Keep the `devSimulate` prop in `LiveVisitorMap` itself so it can still be used in admin-only contexts.

2. Exclude simulated traffic from all aggregations
   - Update `public.public_startup_totals(_ids uuid[])` to only count impressions/clicks where `referrer != 'dev-simulate'`.
   - Update `public.public_startup_daily(_ids uuid[])` with the same filter.
   - Update `public.public_startup_24h(_ids uuid[])` with the same filter.
   - Update `public.public_network_totals(_ids uuid[])` with the same filter.
   - Update `public.public_network_activity()` with the same filter.
   - Update `public.public_network_totals_all()` with the same filter.

3. Fix client-side dashboard queries
   - Update `loadDashboardData` in `src/routes/_authenticated/dashboard.tsx` to filter out `referrer = 'dev-simulate'` when counting impressions and clicks.
   - Update `loadTrafficBreakdown` to exclude simulated referrers from countries, devices, and top referrers.

4. Clean up existing simulated records
   - Run a one-time cleanup: delete (or move to a separate audit table) all `impressions` rows where `referrer = 'dev-simulate'`.
   - Verify the leaderboard and network page recompute without those rows.

5. Verify
   - Confirm the dashboard no longer shows the simulate button.
   - Confirm leaderboard rankings drop for any founder who abused the feature.
   - Confirm network totals and activity panels exclude simulated traffic.

Out of scope
------------
- Adding new anti-abuse rate limits (this plan focuses on removing the exposed exploit and cleaning the data).
- Changing the widget loader or heartbeat logic.

Expected result
---------------
Founders can no longer simulate visitors, existing simulated impressions are removed from stats, and the leaderboard/network numbers reflect only real widget traffic.