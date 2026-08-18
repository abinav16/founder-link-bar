# Fix "Something broke" in hardened browsers (LibreWolf)

## What the screenshot shows

That white card is our own React error boundary in `src/routes/__root.tsx` ("Something broke / Try again or head home"). It renders whenever a route component throws during render on the client. So it is not a server outage: the page loaded, then the app crashed while rendering in that browser. Chrome is fine, LibreWolf is not, which points at a browser API that LibreWolf blocks or hardens (storage access, canvas, or a blocked third party script).

The exact throwing line is not confirmed yet, so step 1 is reproducing it rather than guessing.

## Step 1: reproduce

Run the site in a headless browser configured like LibreWolf's strict mode and capture the real error:

- storage access denied (`localStorage`/`sessionStorage` getters throw `SecurityError`)
- canvas readback blocked / `getContext` returning null
- third party requests (Google Fonts, Google Analytics) blocked

Log the console error and stack from the crash, so the fix targets the actual line.

## Step 2: make storage access safe everywhere

Several places call storage directly with no try/catch, and a throw there happens during render, which is exactly what triggers this boundary. Add one small helper (`src/lib/safe-storage.ts`) exposing `getItem` / `setItem` / `removeItem` that swallow errors and fall back to an in memory map, then use it in:

- `src/routes/leaderboard.tsx` (read inside a `useState` initializer, render time, highest risk)
- `src/routes/index.tsx`, `src/routes/widget.bar.tsx`, `src/routes/startup.$slug.tsx`, `src/routes/auth.tsx`, `src/routes/auth_.callback.tsx`, `src/components/FeaturedBookingDialog.tsx`, `src/routes/_authenticated/dashboard.tsx`

Behaviour is unchanged for normal browsers; hardened ones just lose the caching niceties instead of crashing.

## Step 3: harden the hero canvas and analytics

- Wrap the orbit canvas animation setup in `src/routes/index.tsx` so any canvas failure disables the animation instead of bubbling up.
- Ensure the analytics helper stays a no op when `gtag` is blocked (already the case, verify after repro).

## Step 4: make the error boundary less of a dead end

Keep the boundary, but degrade better: log the underlying message to the console for support, and keep Retry/Home. Optionally show a one line hint that a strict privacy or content blocker can cause it.

## Verification

Re run the hardened browser script from step 1 on `/`, `/network`, `/leaderboard`, and a startup profile page, confirming each renders with zero uncaught errors.
