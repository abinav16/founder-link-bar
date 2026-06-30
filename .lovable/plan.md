## Problem

On iOS Safari, the page jumps upward every few seconds. Root cause is the iframe height pipeline:

1. `widget.bar.tsx` posts `startupbar:resize` on every render where `loaded`/`showInfo`/`dismissed` change, sending `wrapperRef.current.scrollHeight`. iOS Safari can report sub-pixel/fluctuating `scrollHeight` values after font load, favicon load, and theme repaints.
2. `loader.js` unconditionally assigns `iframe.style.height = e.data.height + 'px'` on every message. Even setting the same height re-lays-out the fixed iframe and, combined with the one-time `document.body.style.marginTop += 36`, nudges iOS scroll anchoring.
3. The heartbeat itself (`new Image()` ping) is harmless, but it runs 1.5s after inject — which is exactly when users report the first jump, making it a red herring.

## Fix

**`public/widget/loader.js`**
- Track `currentHeight`; in the `message` handler, ignore messages where `Math.round(e.data.height) === currentHeight`. Only assign `iframe.style.height` when it actually changes.
- Replace the one-shot `document.body.style.marginTop += 36` with a stable `document.documentElement.style.setProperty('scroll-padding-top', '36px')` plus a single `body.style.paddingTop = '36px'` (idempotent — guard with a `data-startupbar-injected` attribute so re-injection can't double it). Padding doesn't shift scroll anchor on iOS the way margin does.
- Keep heartbeat, MutationObserver theme detection, and resize message contract unchanged.

**`src/routes/widget.bar.tsx`**
- Replace the `[showInfo, dismissed, loaded]` effect that posts `scrollHeight` with a `ResizeObserver` on `wrapperRef.current` that:
  - Rounds height to integer.
  - Only calls `window.parent.postMessage` when the rounded value differs from the last sent value (kept in a `useRef`).
  - Sends `0` once on dismiss, then disconnects.
- This eliminates the redundant posts on every re-render and on no-op scrollHeight fluctuations.

## Verification

- iOS Safari (or Playwright iPhone emulation) on a host page with the widget — confirm no periodic scroll jump after load, after theme toggle, and after opening the info panel.
- Confirm: bar still appears, info panel still expands/collapses, dismiss still collapses to 0, dark/light theme still flips via host class change, heartbeat request still fires at ~1.5s.

## Out of scope

No changes to the heartbeat endpoint, theme tokens, or widget visual design.
