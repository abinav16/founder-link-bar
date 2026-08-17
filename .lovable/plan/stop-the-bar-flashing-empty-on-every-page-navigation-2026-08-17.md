# Stop the bar flashing empty on every page navigation

## What happens today

On each page load (and on Livewire/Turbo navigations that swap the body), the loader mounts a fresh iframe inside `document.body`. That iframe loads `/widget/bar` from scratch, and the bar component starts with no startup, so the visible sequence is:

1. blank bar (iframe loading)
2. the generic fallback copy "Discover founder-built tools, join the free traffic exchange" (rendered while `loaded` is false)
3. the real startup once `/api/public/widget/pick` answers

Two separate causes, fixed separately.

## Fix 1: no more generic fallback flash

In `src/routes/widget.bar.tsx`, the fallback copy is shown for any not-yet-loaded state. Change it so:

- While the first pick is still in flight, render a neutral skeleton (logo placeholder plus two muted text blocks in the bar's exact 36px height) instead of the "Join free" message.
- Show the "Join free" fallback only when the fetch has finished and genuinely returned no startup.

## Fix 2: instant paint using the last shown startup

Cache the last successful pick per host in `sessionStorage` (`startupbar:last:<hostId>`), written by the widget page after every successful fetch.

- On mount, read that cache and render it immediately, so a navigation shows a real startup at once instead of a skeleton.
- The normal `pick` request still runs in the background and swaps in the fresh startup when it arrives (using the existing fade transition), so rotation and impression counting are unchanged.
- Impressions still come only from the server call, so the cached paint never inflates counts.

## Fix 3: survive body swaps without reloading the iframe

In `public/widget/loader.js`, mount the iframe on `document.documentElement` instead of `document.body` for the standard (non iPhone Safari) top and bottom placements. Client-side routers replace the body, which is what destroys and reloads the frame; an element parented to `<html>` is untouched, so a Livewire navigation keeps the same live bar with no reload at all.

- Spacing logic keeps writing padding on `body`, unchanged.
- iPhone Safari keeps its current in-flow `body` mount, since that placement depends on document flow.
- The re-assert handler added earlier stays, as a safety net for hosts that do replace `<html>`.

## Result

- Livewire / Turbo / Astro sites: bar stays mounted, zero reload, zero flash.
- Normal full page loads: cached startup paints immediately, refreshed silently a moment later; no generic fallback flash.
