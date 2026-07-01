## Problem

On hunchbank.com the top nav is a `position: fixed; top: 0` bar. On first load, `loader.js` runs `sweepFixedElements()` once and shifts it down by 36px — works. But when the user clicks a header tab, the site does client-side navigation (SPA route change) and re-mounts the header (or a new page's fixed header appears). Our loader never re-sweeps, so the freshly mounted fixed element stays at `top: 0` and sits **behind** the StartupBar.

We removed the `MutationObserver` earlier because it caused the iOS Safari "page jumps every few seconds" bug, so right now there is no re-sweep at all after the initial paint.

## Fix (loader.js only — no impact on startup listing / picking / analytics)

Re-run `sweepFixedElements()` on discrete navigation-ish events instead of on every DOM mutation. These fire rarely, so they won't cause the iOS jump loop:

1. Wrap `history.pushState` and `history.replaceState` to dispatch a `startupbar:locationchange` event, and listen for `popstate` + `hashchange` too.
2. On any of those events, run `sweepFixedElements()` twice: once immediately and once after ~250ms (to catch the header that the SPA mounts after the route transition).
3. Also re-sweep on `load` (some sites mount the sticky header after `DOMContentLoaded`).
4. Keep the existing `data-startupbar-shifted="1"` guard so already-shifted nodes are skipped — re-sweeps are cheap and idempotent.
5. Keep the strict `top === 0px` + `position: fixed|sticky` filter so we still don't touch toasts / modals / mid-page banners.
6. Do NOT re-add `MutationObserver` — that's what caused the iOS jump.

## Why this is safe

- No change to `widget.pick.ts`, heartbeat, click tracking, admin panel, or picking logic.
- No change to iframe sizing or `startupbar:resize` messaging.
- Events used (`popstate`, `hashchange`, wrapped `pushState`/`replaceState`) fire only on real navigation, not on every DOM mutation → no iOS Safari scroll-jump regression.
- Idempotent: `data-startupbar-shifted` guard prevents double-shifting the same node.

## Files touched

- `public/widget/loader.js` — add navigation-event listeners + re-sweep, no other logic changes.

## Immediate note for hunchbank.com

Once this ships, their SPA tab-clicks will re-shift the newly mounted fixed header on `pushState` and after a 250ms settle. No action needed from the founder.
