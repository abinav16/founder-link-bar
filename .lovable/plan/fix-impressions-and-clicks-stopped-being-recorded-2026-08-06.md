# Fix: impressions and clicks stopped being recorded

## What's happening

Confirmed against the database: the last impression was recorded at 18:55 UTC yesterday (00:25 IST) and the last click at 18:02 UTC. Nothing since — not zero traffic, but zero writes.

The widget itself is fine: the pick endpoint returns a real startup on every call. I sent a test call with a fresh session id and no impression row appeared, so the write is being rejected.

Root cause: the write rules (row-level security) on the `impressions` and `clicks` tables check the host startup's `banned` field. Anonymous visitors are not allowed to read that field — the same restriction that broke the widget yesterday. Because the rule itself has to read `banned`, every insert is refused with a permission error, including inserts with no host at all. So the bar still shows, but nothing counts.

## The fix

1. Add a companion database function `public.is_approved_startup(uuid)` (approved status) next to the existing `public.is_approved_host(uuid)` (approved + not banned). Both run with elevated rights and are callable anonymously, so neither exposes `banned`.
2. Replace the insert rules on `impressions` and `clicks` so they call these two functions instead of reading the startups columns directly. Same logic, same protection against non-member hosts — just evaluated in a way anonymous visitors are allowed to run.

## Verification after the change

- Call the pick endpoint with an approved host and a fresh session id, then confirm a new impression row exists.
- Confirm an insert naming a rejected/banned host is still refused.
- Confirm clicks record again on a member site.

## Technical notes

- Migration: `create or replace function public.is_approved_startup(_id uuid) returns boolean language sql stable security definer set search_path = public`; revoke from public, grant execute to anon/authenticated/service_role.
- Drop and recreate `Insert impressions for approved startups` and `Insert clicks for approved startups` with
  `with check (public.is_approved_startup(shown_startup_id) and (host_startup_id is null or public.is_approved_host(host_startup_id)))`.
- No app code change needed; `widget.pick.ts`, `widget.click.ts`, and `track.site-visit.ts` already send the right values.
