# Why the side space looks different, and how to use it for sponsored slots

## What is actually happening

Nothing is different between the two screenshots in terms of your app. The empty area you marked in the Lovable screenshot is the editor's own grey background around the preview frame, not part of the page.

- Lovable preview frame: about 1200px wide. Your content container is capped at 1152px (`max-w-6xl`), so it fills the frame edge to edge and there is almost no side space inside the page.
- Chrome window: about 1920px wide. The same 1152px container is centered, so there IS roughly 380px of free space on each side. That is exactly what screenshot 2 shows.

So the real browser has more usable side space than the preview, not less. The preview is simply too narrow to ever show a side rail.

Current widths:
- Network, startup profile, header/footer: `max-w-6xl` (1152px)
- Leaderboard: `max-w-5xl` (1024px), even narrower

## Plan for sponsored side slots

1. Introduce a shared page shell that keeps the main column at its current width but adds an optional right (or left+right) rail that only renders at `2xl` and above (>=1536px viewport). Below that breakpoint the rail is hidden entirely so nothing shifts on laptops, tablets or the Lovable preview.
2. Widen the outer wrapper on those large screens (main column + gap + 300px rail) while the inner content column keeps its current 1152px / 1024px cap so existing layouts are untouched.
3. Apply the shell to Network, Leaderboard and the startup profile page.
4. Rail content: sticky sponsored card stack (logo, name, one liner, CTA), with a placeholder "Sponsor this slot" card when no sponsor is booked.
5. On screens below 1536px, fall back to a single inline sponsored card placed between sections so sponsors still get delivery on smaller viewports.

To review the rail while building, the preview must be widened or checked in a real browser window, since the preview frame itself is narrower than the breakpoint.

## Technical notes

- New component `src/components/PageShell.tsx` with `hidden 2xl:block w-[300px] shrink-0 sticky top-20` rail.
- Grid: `2xl:grid 2xl:grid-cols-[minmax(0,1fr)_300px] 2xl:gap-8 2xl:max-w-[1500px]`, main child keeps `min-w-0`.
- Sponsored data source is not decided yet; first pass renders static placeholder slots so layout can be reviewed before any table or admin work.

## Open question

Do you want sponsored slots backed by the database and an admin screen from the start, or static placeholders first so we can lock the layout?
