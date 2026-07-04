## Impact answer

Yes — dropping the `Anyone can read clicks` / `Anyone can read impressions` policies WILL break UI if we don't also change how the app reads those tables. The following public pages currently rely on the anon SELECT policy (they use the publishable key server-side):

- `/leaderboard` — click totals, impression totals, and 7-day buckets per approved startup
- `/network` — total impressions/clicks, CTR, per-startup 24h impressions/clicks

The signed-in founder dashboard is fine — it's covered by the existing owner-scoped policy.

## Recommended fix (Option 1 — aggregate-only RPCs)

Move public aggregates behind `SECURITY DEFINER` DB functions that return only counts, not raw rows. Then remove the anon SELECT policies. Anon can no longer read `referrer`, `device`, `country`, or host relationships — only the aggregate numbers the UI already displays.

### Steps

1. **Migration** — add public RPCs, revoke defaults, grant execute to `anon`:
   - `get_public_leaderboard()` → returns per-approved-startup: `impressions`, `clicks`, `impressions_given`, plus 7-day arrays for received + given impressions.
   - `get_public_network_dashboard()` → returns `stats` (totalStartups, totalImpressions, totalClicks, ctr) and per-startup `impressions_24h`, `clicks_24h`.
   - All `SECURITY DEFINER`, `SET search_path = public`, `STABLE`, `REVOKE ALL FROM PUBLIC`, `GRANT EXECUTE TO anon, authenticated`.
   - `DROP POLICY "Anyone can read clicks" ON public.clicks;`
   - `DROP POLICY "Anyone can read impressions" ON public.impressions;`

2. **Code** — swap `.from("clicks")/.from("impressions")` aggregate reads in:
   - `src/lib/leaderboard.functions.ts` → call `get_public_leaderboard` RPC.
   - `src/lib/network-dashboard.functions.ts` → call `get_public_network_dashboard` RPC.
   - `widget.click.ts` insert path is unchanged (still uses existing INSERT policy).
   - `_authenticated/dashboard.tsx` unchanged (owner-scoped policy still applies).

3. **Verify** — reload `/leaderboard` and `/network` in preview, confirm numbers still render and match pre-change.

## Out of scope

Other findings in the panel (send-email auth, checkout auth, heartbeat spoofing, verify-install SSRF, startups column exposure, security-definer linter warnings). Handle separately if you want.

## Alternative

If you'd rather ship faster and skip the RPC layer, we can switch just those two server functions to the admin client. It closes the anon exposure but concentrates trust in those functions — I'd only do it if you want a same-turn minimal fix.
