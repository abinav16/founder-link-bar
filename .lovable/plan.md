## Why the user sees it on iPhone but you don't on iPad

iPad Safari (even with "Request Mobile Website") does **not** have the collapsing address bar that iPhone Safari has. The jump the reporter describes is caused by iPhone Safari recalculating the visual viewport every time the URL bar shrinks/expands on scroll. Our current embed has two things that make WebKit re-anchor during that recalculation:

1. A **fixed iframe at `top: 0`** covering the top 36px.
2. A permanent **`body { padding-top: 36px }`** we inject.

Together these are a well-documented trigger for the iOS 26 Safari "fixed/sticky elements shift vertically" bug (WebKit bug 297779 and Stack Overflow reports with 49k+ views). It won't reproduce on iPad, macOS Safari, Chrome iOS, or desktop DevTools mobile emulation.

So the reporter isn't lying — it's an iPhone-Safari-only WebKit issue we have to work around.

## Plan (safe, no widget functionality changes)

### 1. Detect iPhone Safari only
In `public/widget/loader.js`, add a narrow UA check for iPhone/iPod Safari (exclude iPad, Chrome iOS, in-app WebViews). Everything below only changes behavior for that subset.

### 2. Switch iPhone Safari to a non-shifting layout mode
On iPhone Safari only:
- Do **not** add `body { padding-top: 36px }`.
- Do **not** sweep and rewrite host `fixed` / `sticky` headers.
- Keep the iframe rendered, but change it from `position: fixed; top: 0` to a normal in-flow element inserted at the top of `<body>` (or use `position: sticky; top: 0` on a lightweight wrapper). This eliminates the fixed-element / viewport-recalc interaction that WebKit mishandles.

Result: the bar still appears at the top on every page, but there is no more fixed-position + padding combo for Safari to re-anchor around, so the jump stops.

### 3. Preserve everything else
- Desktop and non-iPhone browsers keep the current fixed iframe + body padding + header shifting (works well there).
- Widget picking, clicks/UTMs, dark-mode detection, dismiss, heartbeat, admin health tracking, SPA re-sweeps — all untouched.
- Height messaging from `widget.bar.tsx` untouched; only the outer positioning strategy differs on iPhone Safari.

### 4. Verify
- Read the final `loader.js` to confirm iPhone Safari branch never mutates host `body` padding or host headers.
- Confirm desktop path is byte-identical to current behavior.
- Ask the reporter to retest on iPhone Safari after publish.

## Technical notes
- UA test: `/iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)`.
- In-flow injection: prepend the iframe as the first child of `<body>` with `position: static; display: block; width: 100%; height: 36px`. Content below flows naturally, no padding needed, no fixed-element shifting.
- If any host site has `body { margin: 0 }` overridden weirdly, the iframe still renders correctly because it's a block element with explicit width/height.