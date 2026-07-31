## Diagnosis (confirmed in code)

The shaking is not the black pill itself — it's the logo bodies inside it in `src/routes/network.tsx` (`MagneticField`). Three things in the simulation loop fight each other every frame:

1. **Every logo is forced to the floor.** All nodes share one `homeY` (bottom line), and after collision resolution there's a hard clamp: `if (node.y > node.homeY) { node.y = homeY; node.vy = 0 }`. A logo pushed up by the logo below it is yanked back down next frame → push up, snap down, push up = tremble. This is exactly the "forcing it to be on the bottom instead of landing on the obstacle" you described.
2. **No support detection.** `onGround` is only `y >= homeY`. A logo resting *on another logo* is never considered grounded, so it never gets ground friction and never comes to rest — gravity keeps adding `vy` each frame and the overlap push cancels it, forever.
3. **Single-pass, full-strength overlap resolution.** One separation pass at 100% correction with a dense pile overshoots and ping-pongs neighbours; the `Math.round()` on the transform makes the last sub-pixel wobble visible.

So yes — it's a real bug, not a rendering artifact.

## Fix: real resting contacts, same look

Keep gravity, the mouse-thread attraction/snap, the rounded-pill walls, rolling rotation, and the organic random pile. No grid, no lanes, no linear arrangement — logos land wherever they land, including on top of each other.

Changes, all inside `MagneticField` in `src/routes/network.tsx`:

- **Remove the post-collision floor clamp.** Replace it with a floor constraint applied only when a body is actually below the floor, resolved *before* the stacking solver, and only zeroing downward velocity.
- **Add contact/support detection.** A body is "resting" if it touches the floor *or* another body that is itself resting, from roughly below (contact normal pointing up). Resting bodies get ground friction and rolling, exactly as floor-contact bodies do today.
- **Iterative soft separation.** Run the pairwise overlap pass 3–4 times per frame at ~60–70% correction with a small penetration slop (~0.5px) instead of one 100% pass. Standard technique; it settles a pile instead of oscillating it.
- **Sleep state.** When a body's speed stays under a small threshold for ~20 consecutive frames, zero its velocity and stop integrating it until something touches it, the mouse comes near, or the layout resizes. This is what actually kills residual shimmer in a dense pile.
- **Sub-pixel transforms.** Drop `Math.round()` on the translate so a settled body doesn't flicker between two pixel positions.
- **Wall response tuning.** Keep the rounded-end wall collisions but apply them before the separation pass so a wall push and a neighbour push don't cancel each other on alternate frames.

## Result

Logos still drop with gravity, roll, get dragged by the cursor thread and snap back — but they now stack on each other like real objects, settle, and go still. The pile stays irregular and organic; nothing gets arranged in a line.

## Verification

Load `/network` in a headless browser, let it settle ~4s, then sample each logo's transform over 60 frames and confirm max positional delta is ~0 for settled bodies (today it oscillates continuously). Also check with the cursor swept through the pile that bodies re-wake and re-settle.
