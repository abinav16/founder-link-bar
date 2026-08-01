## Problem

`public/widget/loader.js` reserves space for the bar in three ways when it injects:

1. `document.body.style.paddingTop = existingPad + 36px`
2. `document.documentElement.style.scrollPaddingTop = '36px'`
3. `sweepFixedElements()` pushes every `position: fixed/sticky; top: 0` element down to `top: 36px`

When a user clicks the X, `src/routes/widget.bar.tsx` posts `{ type: 'startupbar:resize', height: 0 }`. The loader's message handler only sets `iframe.style.height = '0px'` — the body padding, scroll padding, and shifted fixed elements all stay in place. Result: a 36px empty gap at the top after closing.

## Fix

In `public/widget/loader.js`:

- Record the body's original `padding-top` inline value at inject time (alongside the existing `data-startupbar-originalTop` pattern used for fixed elements).
- Add an `unshiftFixedElements()` helper that walks elements marked `data-startupbar-shifted="1"`, restores `el.style.top` from `data-startupbar-original-top`, and clears the markers.
- In the resize message handler, when height is `0`: restore body padding-top, clear `scrollPaddingTop`, call `unshiftFixedElements()`, hide the iframe (`display: none`), and stop the resweep/heartbeat side effects from re-applying the offset (guard `sweepFixedElements` and the resize handler with a `dismissed` flag).
- When height goes back above 0 (info panel expand/collapse still uses this path), keep current behaviour — only the explicit `0` height triggers teardown.

Also persist dismissal so the bar doesn't reappear with the gap on the next page view within the session — set a `sessionStorage` flag on dismiss and skip injection entirely when it's present (this also avoids re-adding padding on SPA navigations).

## Verification

Load a local test page with the loader script, click the X, and confirm via computed styles that `body { padding-top }` returns to its original value, the fixed header returns to `top: 0`, and no visual gap remains.
