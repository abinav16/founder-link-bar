# Increase circling startup logos to ~100

## What changes

Increase the number of circling startup logos in the homepage hero from the current **56** to **~100** while keeping the same 4-ring layout.

```text
Before:  8 + 12 + 16 + 20 = 56 logos
After:  16 + 20 + 28 + 36 = 100 logos
```

This gives each approved startup a higher chance of appearing in the orbit animation and fills the hero rings more densely without adding new rings.

## Where

`src/routes/index.tsx` — the `HeroCanvas` component:

- Update `TOTAL_DOTS` constant.
- Update the per-ring dot count formula (`count = 8 + ri * 4`).
- Optionally fine-tune ring radii or logo size if the preview looks too crowded.

## Technical notes

- The ring count stays 4, only the number of dots per ring increases.
- The current logo-slotting logic (`step = Math.floor(TOTAL_DOTS / shuffled.length)`) continues to spread startups evenly across available slots.
- No database or widget changes are needed.
- After the change, verify the preview at `/` to make sure logos are still readable and the animation is smooth.

## Out of scope

- Widget position / bottom placement option (user said no).
- Any other landing page changes.
