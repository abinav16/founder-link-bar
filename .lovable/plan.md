## Root cause (high confidence)

The Reddit comment "on mobile Safari the site jumps around every couple of seconds" points at the widget's fixed-element shifter in `public/widget/loader.js`, not the iframe height. Two iOS Safari–specific behaviours combine to cause the jump:

1. iOS Safari's URL bar collapse/expand fires layout + DOM mutations on the host page every couple of seconds while the user scrolls or the visual viewport changes.
2. Our loader's `MutationObserver` on `document.documentElement` catches every added node and re-runs `shiftFixedElement` on it. If the host site re-renders any `position: fixed` / `sticky` header (very common on SPA sites — React portals, Framer/Webflow sticky nav, cookie banners), the element is added fresh without the `data-startupbar-shifted` guard, so we shift it by another 36px. That's the "jump" the user sees.

Secondary cause: on iOS Safari, mutating inline `top` on a fixed element that also has a CSS transition triggers a visible animated slide — every few seconds — which matches the report exactly.

## Fix (minimal, loader-only)

Edit only `public/widget/loader.js`. No changes to `widget.bar.tsx`, no schema, no other files.

1. **Stop the MutationObserver-driven shifting.** Remove `startFixedObserver()` and its call site. Keep the one-time `sweepFixedElements()` at inject time so the initial pass still handles the site's existing sticky header.
2. **Skip elements that already sit below 36px.** Tighten `shiftFixedElement` so we only touch elements whose computed `top` is `0px` (the ones that would actually be hidden). Anything with `top >= 1px` is left alone — this eliminates almost all false positives (cookie banners, chat bubbles, toasts pinned lower on the page) without losing coverage of true top-anchored nav bars.
3. **Never re-shift.** Keep the `data-startupbar-shifted` guard; combined with removing the observer, an element can be shifted at most once for the page's lifetime.
4. **Body padding stays as-is.** `body { padding-top: 36px }` already prevents the initial content overlap, so most sites don't need any per-element shifting anyway.

## Why this fixes the iOS jump

- No mutation-driven re-shifts means the periodic DOM churn Safari triggers during URL-bar collapse no longer moves anything.
- The single sweep at inject runs before the user can perceive a jump.
- Sites whose header we do shift get shifted exactly once, at load, so any CSS transition on `top` fires imperceptibly during initial paint rather than every few seconds mid-scroll.

## What this does NOT change

- Iframe height behaviour, dismiss, theme detection, heartbeat, click tracking — all untouched.
- Widget still ends up visible on top; body padding still prevents content from hiding under the bar.
- If a specific site's sticky header still overlaps because it renders after inject, we can add a small `setTimeout` re-sweep at 1s/3s in a follow-up — but that's opt-in, not the current behaviour that causes the jump.

## Verification

After the change I'll drive Playwright against a page with a `position: fixed; top: 0` header to confirm the shift happens exactly once and no repeated mutations occur, then ask you to reload the reporter's site on iOS Safari to confirm the jump is gone.