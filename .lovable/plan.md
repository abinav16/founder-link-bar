## Goal

Make the StartupBar widget auto-offset the host page so nothing hides behind the 36px fixed bar — including fixed/sticky headers that pin to `top: 0`, and any such elements added later.

## Changes — `public/widget/loader.js` only

All other files (`widget.bar.tsx`, heartbeat, theme detection, resize contract) stay untouched.

### 1. Keep existing body padding behavior

The current `inject()` already sets `body.paddingTop += 36px` guarded by `data-startupbar-injected`. Leave that as-is (it already satisfies requirement #1).

### 2. New helper: `shiftFixedElement(el)`

Runs only on `Element` nodes. Logic:

- Read `getComputedStyle(el).position`. Bail unless `fixed` or `sticky`.
- Skip the widget iframe itself and anything inside it.
- Skip if `el.dataset.startupbarShifted === '1'` (idempotent).
- Read the computed `top` value:
  - If `top` is `auto` → treat as 0, qualifies for shift.
  - If `top` parses to a px value `<= 36` → qualifies.
  - If `top` parses to `> 36px`, or uses a non-px unit we can't safely compare (`%`, `vh`, `calc(...)` we didn't author) → leave alone.
- When shifting: set `el.style.top = (originalTopPx + 36) + 'px'` (so a header at `top:0` becomes `top:36px`, a banner at `top:10px` becomes `top:46px` — only when original ≤ 36), mark `el.dataset.startupbarShifted = '1'`, and stash the original inline `top` in `el.dataset.startupbarOriginalTop` for safety.

### 3. Initial sweep

Right after `inject()` appends the iframe and sets body padding, walk `document.querySelectorAll('*')` and call `shiftFixedElement` on each. Done once.

### 4. MutationObserver for late-added elements

Add a second observer (separate from the theme observer so its filter stays narrow):

- `observe(document.documentElement, { childList: true, subtree: true })`.
- On each mutation, iterate `addedNodes`; for each `Element`, run `shiftFixedElement` on the node itself and on `node.querySelectorAll('*')`.
- Cheap guard: skip nodes inside the StartupBar iframe.

Style mutations (e.g. JS later flipping an element to `position: fixed`) are out of scope — covering them would require observing `attributes: ['style', 'class']` subtree-wide, which is expensive and risks loops. The childList observer handles the common case (frameworks mounting headers/banners after hydration).

### 5. Preserve everything else

No changes to: iframe creation, `startupbar:resize` handler, theme `detectTheme` / theme MutationObserver, `isWidgetVisible`, heartbeat, iframe guard, or the `data-startupbar-injected` idempotency flag.

## Verification

- Playwright against a test host page with: (a) a `position: fixed; top: 0` header, (b) a `position: sticky; top: 0` nav, (c) an element with `top: 50px` (must NOT move), (d) a header injected via `setTimeout` after load (must shift). Screenshot before/after.
- Confirm widget bar still renders at the top, heartbeat fires, theme toggle still flips colors, resize messages still adjust iframe height.

## Out of scope

- Restoring shifted `top` values on widget removal (widget has no removal API).
- Handling elements that become fixed later via inline style/class changes.
- Adjusting `bottom`-anchored elements (widget is at top only).
