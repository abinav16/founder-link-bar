# Widget bar: dot separator + 30s auto-rotation

## What changes

1. **Separator** — the em dash between startup name and description becomes a middle dot (`·`), on both the desktop (truncated) and mobile (marquee) layouts.

2. **Auto-rotation** — every 30 seconds the bar swaps to a different startup from the network:
   - current startup fades out over 0.5s
   - new startup fades in over 0.5s
   - the bar height stays fixed, so the host page never jumps
   - rotation pauses while the info panel is open, while the tab is hidden, and after the visitor dismisses the bar

## Technical notes

All work is in `src/routes/widget.bar.tsx`:
- Extract the existing pick fetch into a reusable `fetchStartup()` and call it on an interval (30s), guarded by `document.visibilityState === "visible"` and `!showInfo && !dismissed`.
- Wrap the startup content in a container with `opacity` transition (500ms). On tick: set opacity 0, wait 500ms, swap the startup state, set opacity 1.
- The pick endpoint already dedupes impressions per session per startup (`sid`), so rotating does not inflate impression counts — each distinct startup shown in a session counts once, which is the intended reach measure.
- No changes to `public/widget/loader.js` or the pick API.
