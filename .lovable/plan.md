**Root cause:** The hero `<canvas>` in `src/routes/index.tsx` (`HeroCanvas`) is sized using `canvas.width = canvas.offsetWidth` (CSS pixels) with no devicePixelRatio scaling. On retina screens (dpr=2) the browser upscales the canvas bitmap to fill 2× the physical pixels, which makes the rings, dots, connecting lines, and favicon logos all look soft/blurry. The favicons are also fetched at `sz=32` and drawn into a 22px circle — already low-res before retina upscaling.

**Fix (only `HeroCanvas` in `src/routes/index.tsx`):**

1. In `resize()`, use DPR-aware sizing:
   - `const dpr = window.devicePixelRatio || 1;`
   - Set `canvas.width = offsetWidth * dpr`, `canvas.height = offsetHeight * dpr`.
   - Set CSS size via `canvas.style.width/height` in px to keep layout unchanged.
   - `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` so all existing draw code keeps using CSS pixel coordinates (`cx = offsetWidth/2`, etc.).
2. Replace `canvas.width/height` reads inside `draw()` / `init()` with `canvas.offsetWidth/offsetHeight` (CSS-space) so ring centering math is correct after the transform.
3. Bump favicon resolution from `sz=32` → `sz=64` in the `img.src` template, so the 22px logo circles render crisp on retina.
4. Re-init dots inside `resize()` only when CSS size actually changes (avoid resetting on DPR-only changes); keep existing behavior otherwise.

No layout, design, color, or animation changes — only sharper rendering.