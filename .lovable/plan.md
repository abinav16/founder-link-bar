# Detect + surface CSP iframe/img blocking on the apply page

## Why

The apply page's "Verify installation" step today only detects one CSP case: `cspBlocked` (script blocked). If the site is like Promptly — script allowed but iframe blocked by `frame-src` fallback — verify reports "installed ✓" green, the founder submits, and gets rejected later. That gap is the whole reason we added the new admin rejection reason.

Fix it at the source so founders self-serve before applying.

## Changes

### 1. `src/routes/api/public/verify-install.ts` — detect two more CSP cases

The endpoint already parses CSP for scripts. Extend the same parser:

- Add `allowsStartupbarFrame(policy)` — reads `frame-src` → falls back to `child-src` → falls back to `default-src`. Same source-token matching (`*`, `https:`, `startupbar.co`, `*.startupbar.co`, `https://startupbar.co`, `https://*.startupbar.co`).
- Add `allowsStartupbarImg(policy)` — reads `img-src` → falls back to `default-src`. Matches `*`, `https:`, `data:`, `https://www.google.com`, `https://*.googleusercontent.com`, `https://*.supabase.co`, `https://startupbar.co` (favicon hosts we actually use).

Extend the response JSON:

```ts
{ installed, suspicious,
  cspBlocked,        // existing — script blocked
  cspFrameBlocked,   // NEW — iframe blocked (visible: broken frame icon)
  cspImgBlocked }    // NEW — favicon may not render
```

Keep `cspBlocked` name/shape for backwards compatibility.

### 2. `src/routes/apply.tsx` — new verify states + tailored guidance

- Extend `verifyStatus` union: add `"csp-frame"` and `"csp-img"` alongside existing `"csp"`.
- Update the priority order inside `checkInstallation`:
  1. `installed && cspFrameBlocked` → `"csp-frame"` (most severe — bar visibly broken).
  2. `installed && cspBlocked` → `"csp"` (existing, script blocked).
  3. `installed && cspImgBlocked` → `"csp-img"` (soft warning — installed, favicons may not show).
  4. `installed` → `"live"`.
  5. otherwise → `"not-found"` / `"error"` as today.
- Add a new red panel for `csp-frame` right below the existing script CSP block, styled identically (same `ShieldAlert`, same `CopyableCode`, same red-50 background). Copy:
  - Title: **"Your CSP is blocking the widget iframe"**
  - Body: "Your script loads fine, but your Content-Security-Policy has no `frame-src` directive — so the browser falls back to `default-src 'self'` and blocks the StartupBar iframe. Your visitors see a broken frame icon where the bar should be. Merge these directives into your existing CSP:"
  - CopyableCode content:
    ```
    script-src 'self' https://startupbar.co;
    frame-src  https://startupbar.co;
    img-src    'self' data: https://www.google.com https://*.googleusercontent.com;
    ```
  - Border-left color `red-500` (same treatment).
- Add a softer amber panel for `csp-img` (installed but images restricted) using `ShieldAlert` amber-50:
  - Title: **"Widget is live — but favicons may not render"**
  - Body: "Your CSP's `img-src` blocks external images. The bar itself renders, but the featured startup's favicon will show as a broken image. To fix, add these hosts to `img-src`:"
  - CopyableCode: `img-src 'self' data: https://www.google.com https://*.googleusercontent.com;`
  - Border-left color `amber-500`.
  - Non-blocking: the "Submit application" flow can still proceed on this state (unlike frame-blocked, where we should treat it like `csp` and block submission — matches how `csp` is already handled).

Where the current code gates submission on `verifyStatus === "live"`, treat `"csp-img"` as also acceptable (soft warning only). `"csp-frame"` remains blocking, same as `"csp"`.

## Out of scope

- No changes to `loader.js`, `widget/bar`, admin flow (already done last turn), or DB.
- Not going to auto-recheck — the existing "Check now" button is fine.

## Files touched

- `src/routes/api/public/verify-install.ts` — add two CSP checks, extend response.
- `src/routes/apply.tsx` — extend `verifyStatus` union, priority order in `checkInstallation`, two new result panels, allow submission on `csp-img`.
