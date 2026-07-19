## Problem

In `src/routes/__root.tsx` the inline loader-injection script skips widget injection when `pathname` matches `/network`, `/leaderboard`, `/dashboard`, `/account`, or `/auth`. On client-side navigation into those pages the previously-injected iframe stays, but a hard refresh re-runs the guard and hides it — causing the inconsistent behavior.

## Change

In `src/routes/__root.tsx`, remove the `appRoutes` exclusion inside the inline `<script>` so the loader is injected on every route (including on refresh of app pages).

Result: widget appears on all pages consistently on both client-side navigation and page refresh.

No other files need changes — `public/widget/loader.js` already handles injection, theme detection, heartbeat, and cleanup uniformly.
