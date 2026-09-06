# Fix dashboard and leaderboard stats timeouts

## What is happening

Project monitoring found that analytics queries against `impressions`/`clicks` are timing out (36 times in the last 24 hours). When they time out, the member dashboard and public leaderboard/network pages show zeros or blank charts.

## Root cause

The `impressions` table is now ~278,000 rows / 124 MB and growing fast. Several hot paths re-count rows from scratch on every page load:

- `widget_pick_weights()` — called on every widget impression; uses a correlated subquery to count each approved startup's 7-day "given" impressions. Mean 49 ms, max 2,968 ms, 10.9M total ms in the last window.
- `public_network_activity()` and `public_network_totals_all()` — full `count(*)` across the whole `impressions`/`clicks` tables.
- `public_startup_totals()` and `public_startup_daily_v2()` — correlated subqueries per startup per day.
- Dashboard `loadDashboardData()` — full `count(*)` and fetches thousands of raw rows to build charts and breakdowns.

Existing indexes cover `(shown_startup_id, created_at)` and `(host_startup_id, created_at)`, but they cannot save full-table counts or correlated per-startup loops.

## Fix

Add pre-aggregated counter tables and make every read path use them.

### Database changes

1. **Create rollup tables**
   - `public.startup_stats_totals` — lifetime impressions received/given, clicks received/given per startup.
   - `public.startup_stats_daily` — the same four counters per startup per day.
   - `public.network_stats_daily` — network-wide impressions and clicks per day.
   - Include GRANTs for `authenticated`/`service_role`, enable RLS, and add a policy so authenticated users can only read their own startup's rows (public pages will read through security-definer RPCs).

2. **Backfill from existing data**
   - Populate totals and daily rollups from the current `impressions`/`clicks` tables in the migration itself.

3. **Keep rollups live with triggers**
   - `AFTER INSERT` triggers on `impressions` and `clicks` increment the relevant total and daily counters.
   - Use `INSERT ... ON CONFLICT DO UPDATE` so the trigger is idempotent and fast.

4. **Add one missing index**
   - `CREATE INDEX idx_impressions_referrer_created ON public.impressions (referrer, created_at)` to speed any remaining time-range network queries that filter by referrer.

### RPC / function rewrites

Rewrite these to read from the rollup tables instead of counting raw rows:

- `public_startup_totals(_ids)` → read `startup_stats_totals`.
- `public_startup_daily_v2(_ids)` → read `startup_stats_daily` for the last 7 days.
- `public_startup_hourly(_ids)` → keep reading raw rows for today only (small set), but simplify.
- `public_startup_monthly(_ids)` → read `startup_stats_daily` and bucket by month.
- `public_network_activity()` → read `network_stats_daily` for today/yesterday.
- `public_network_totals_all()` → sum `startup_stats_totals` (or keep a `network_stats_totals` row).
- `widget_pick_weights()` → read a 7-day "given" counter from `startup_stats_daily`.

### Frontend changes

- `src/routes/_authenticated/dashboard.tsx`
  - Replace the full `impressions`/`clicks` `count(*)` calls and the 2,000-row raw fetches with new server functions that return pre-aggregated totals, daily buckets, and top referrers from the rollups.
  - Keep the same UI; only the data source changes.
- `src/lib/leaderboard.functions.ts`
  - Keep the same response shape, but the underlying RPCs now read rollups.
- `src/lib/network-dashboard.functions.ts`
  - Switch `public_network_totals_all` and 24-hour/lifetime RPCs to rollup-backed versions.

### Verification

- Run `EXPLAIN (ANALYZE, BUFFERS)` on the rewritten RPCs to confirm index/rollup usage.
- Re-run `supabase--slow_queries` after deploy to confirm `widget_pick_weights`, `public_network_activity`, and `public_network_totals_all` drop out of the top offenders.
- Check the dashboard and leaderboard previews load without zero/blank states.

## Tradeoffs

- Trigger-maintained counters add a tiny amount of write overhead per impression/click, but eliminate expensive re-counting on every read.
- Storage grows by a few extra rows per startup per day (negligible compared with the raw tables).
- Rollups are real-time, not cached/stale.

## Out of scope

- No changes to the widget rendering, billing, or auth flows.
- No deletion of raw `impressions`/`clicks` data.
