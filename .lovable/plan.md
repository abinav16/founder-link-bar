# Fix: widget shows the default "Join free" bar on every member site

## What's wrong

Every member site is getting the generic fallback bar instead of a real startup. Confirmed live:
`/api/public/widget/pick` returns a startup when called with no host, but returns `null` for **every** host id — including approved, non-banned members (verified against Career Jumpship and SignalCraft, both `approved`, `banned = false`).

Root cause, confirmed against the database: the host membership check reads the columns `status` and `banned` from the startups table using the public (anonymous) key. Column-level read access was granted to a specific list of columns, and `banned` is **not** in that list. So the read fails with a permission error, the check falls back to "not a member", and the widget refuses to serve a startup on any site. Direct check: reading `status,banned` anonymously returns `permission denied for table startups`, while reading the allowed columns works.

This also silences click and impression recording on member sites, since the click endpoint runs the same check.

## The fix

1. Add a database function `public.is_approved_host(_id uuid)` that returns true/false, runs with elevated rights, and is callable by anonymous visitors. It answers "is this host an approved, non-banned member?" without exposing the `banned` field to the public.
2. Change the host check (`src/lib/host-check.ts`) to call that function instead of reading the columns directly. Keep the existing 60-second cache.
3. Important safety change: if the check itself errors (network/database blip), treat the host as **allowed** rather than blocked. Today an error blocks the bar network-wide; the failure mode should be "keep serving", not "kill the network".

## Verification after the change

- Call the pick endpoint with an approved host id and confirm a startup comes back (not `null`).
- Call it with a rejected/banned host id and confirm it still returns `null`, so the earlier blogspot-style abuse stays blocked.
- Load a member site and confirm the bar shows a real startup with the 30s rotation.

## Technical notes

- Migration: `create or replace function public.is_approved_host(uuid) returns boolean language sql stable security definer set search_path = public`, `revoke all ... from public`, `grant execute to anon, authenticated, service_role`.
- `src/lib/host-check.ts`: `supabase.rpc("is_approved_host", { _id: host })`; cache the boolean; on error return cached value or `true`.
- No change needed in `widget.pick.ts` / `widget.click.ts` — both already call `isApprovedHost`.
