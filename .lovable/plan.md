# Why GrandPrixPicks shows "Live" but the bar isn't on their site

## What I checked

- Fetched `https://grandprixpicks.com` HTML: **no** `startupbar` script, no `data-startup-id`.
- Loaded the page in a real browser: **zero** requests to startupbar.co, no widget iframe.
- Database row: last heartbeat `2026-08-03 10:36 UTC` (04:06 pm IST), `widget_currently_visible = true`.

So they did install it, the widget pinged us at 04:06 pm, and then the script was removed. The site is clean now.

## Why the badge still says "Live"

In the admin table the badge is decided in this order, and the heartbeat wins over the live HTML check:

```text
wrong-id > csp-blocked > heartbeat visible (last 24h) > hidden > script installed > missing
```

Because a heartbeat within **24 hours** marks a row "Live", a startup that removes the script keeps a green "Live" badge for a full day — even though the same check already knows the script is gone ("Not installed"). That is exactly this case: the Widget Health column correctly says "Stale", but the Embed column contradicts it.

## Fix

In `src/routes/admin.tsx`:

1. Only allow "Live" when the current page scan **also** finds the script. If the scan says `missing`, show "Removed" (red) instead of "Live", with the last-seen timestamp in the tooltip so it is obvious the widget used to work and was taken down.
2. Tighten the heartbeat freshness used for "Live" from 24h to a shorter window (keep 24h only as a "seen today" hint in Widget Health), so a stale ping can never present as currently live.
3. Add a `Removed` state to the badge union, its label/color, and tooltip text ("Script was installed and pinged at <time>, but is no longer present in the page HTML").

No backend or database change is needed — the data is already correct; only the admin badge logic is misleading.
