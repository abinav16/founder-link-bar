## Add a handwritten "Try this ✨" annotation to the hero mockup

Skip the video/screenshot swap idea from before. Instead, do exactly what the reference image shows: a hand-drawn arrow + handwritten note pointing at the StartupBar widget bar in the existing hero mockup. Cheap, charming, converts.

### What it looks like

- Below-left of the mockup window (roughly under the traffic-light dots / left edge of the bar), a curved hand-drawn arrow swoops up and points at the STARTUPBAR pill in the fake browser.
- Next to the arrow, two lines of handwriting:
  - `Try this ✨`
  - `(people are addicted)`
- Ink color: warm charcoal (not pure black), slightly rotated (~-4°), casual.
- Desktop only for the full arrow+text; on mobile show just the text pill below the mockup (arrow gets cramped otherwise).

### Implementation

In `src/routes/index.tsx`, in the hero mockup block (the `yourstartup.com` window around the widget bar preview):

1. Wrap the mockup in a `relative` container (likely already is).
2. Add an absolutely-positioned decoration next to the top-left of the widget bar:
   - Inline SVG for the curved arrow (single `<path>`, `stroke-linecap="round"`, ~2px stroke, hand-drawn Bezier curve ending in a small arrowhead pointing up-right at the STARTUPBAR pill).
   - A `<span>` with the two handwriting lines using the **Nothing You Could Do** Google font (loaded via `<link>` in `src/routes/__root.tsx` — matches the reference exactly and pairs well with our existing Instrument Serif / Inter / Lora stack).
3. Hide the SVG arrow on `<md` breakpoints (`hidden md:block`); keep just the handwritten text visible and centered below the mockup on mobile.
4. Add `aria-hidden` on the decorative SVG.

### Font loading

Add `Nothing+You+Could+Do` to the existing Google Fonts `<link>` in `src/routes/__root.tsx` head. Add a `--font-hand` CSS var in `src/styles.css` and a `.font-hand` utility.

### Files touched

- `src/routes/index.tsx` — add annotation markup inside hero mockup
- `src/routes/__root.tsx` — extend Google Fonts URL with the handwriting family
- `src/styles.css` — add `--font-hand` variable and `.font-hand` utility

No logic, no data, no new components. Purely presentational.
