# Add a dedicated rejection reason for CSP blocking the widget iframe

## Why

The Promptly site (screenshot) is a real, common failure mode that our current admin flow does not cover cleanly:

- Their CSP allows `startupbar.co` under `script-src`, so `loader.js` runs and our verify-install check reports "installed ✓".
- But CSP has no `frame-src` / `child-src` directive, so it falls back to `default-src 'self'` and the browser blocks the widget iframe — the visitor sees a broken-image icon where the bar should be.

Today we only have one CSP reason, `csp_blocked`, whose email is written around `script-src` (the code snippet, heading, and "reasonLine" all say the script is being blocked). A founder in Promptly's situation would read that email, check their CSP, see `startupbar.co` is already in `script-src`, and be confused.

## Change

Add a new rejection reason `csp_frame_blocked` distinct from the existing `csp_blocked`, and slightly tighten the existing one so the two are unambiguous. No new tables, no notification email opt-in — reuses the current rejection email machinery you already use.

### 1. Admin UI — new reason

File: `src/routes/admin.tsx` (REASONS array around line 473-482)

Insert a new radio option right after `csp_blocked`:

```
{ value: "csp_frame_blocked", label: "CSP blocks the widget iframe",
  hint: "Script loads, but CSP frame-src/default-src blocks the startupbar.co iframe — visitor sees a broken frame icon." }
```

Tighten the existing `csp_blocked` hint so it's clearly the script-only case:

```
{ value: "csp_blocked", label: "CSP blocks our widget script",
  hint: "Script-src refuses to load startupbar.co/widget/loader.js." }
```

Nothing else in admin.tsx changes — it already forwards `rejectReason` into `setStatus` → `startup-rejected` email with `data.reason`.

### 2. Rejection email copy

File: `supabase/functions/send-email/index.ts` (REASONS map around line 306-383)

Add a new entry `csp_frame_blocked` matching the visual design of the existing `csp_blocked` entry (same reason chip, same code-block styling, same "reapply" CTA). Draft copy:

- Subject: `Action needed: your CSP is blocking the StartupBar bar on {site}`
- Heading: `Your CSP is blocking the widget iframe`
- Reason line: `Content Security Policy blocks the startupbar.co widget iframe`
- Body (kept in the same tone as neighbouring templates):
  - Paragraph 1: our script loads fine on `{site}`, but the browser is refusing to render the bar itself — visitors see a broken frame where the bar should appear (attach the visual context in plain words).
  - Paragraph 2: exact cause — CSP has no `frame-src` directive so it falls back to `default-src 'self'`, which blocks `https://startupbar.co`.
  - Paragraph 3: exact fix, in the same dark code block used by the current `csp_blocked` template:
    ```
    Content-Security-Policy:
      script-src 'self' https://startupbar.co;
      frame-src  https://startupbar.co;
      img-src    'self' data: https://www.google.com https://*.googleusercontent.com;
    ```
    Note that `img-src` line prevents the secondary "favicon doesn't show" bug on strict CSPs.
  - Paragraph 4: "Once your CSP is updated, reapply at startupbar.co/apply and we'll re-check within a few hours." (same wording pattern as other reasons.)

Also lightly retitle the existing `csp_blocked` template so the two don't collide:
- Heading: `Your CSP is blocking our widget script`
- Reason line: `Content Security Policy blocks startupbar.co/widget/loader.js`
- Body unchanged.

### 3. Admin card badge (optional, small)

`src/routes/admin.tsx` around line 383 renders a chip when `rejection_reason === "widget_hidden"`. Add a matching chip branch for `"csp_frame_blocked"` labeled "CSP: iframe blocked" so the admin list is scannable. Follows the same styling as the existing `widget_hidden` chip.

## Out of scope

- No changes to `verify-install.ts`, `loader.js`, `widget/bar`, or the auto-warning cron.
- No new automated email — this only fires when you manually pick the reason and hit "Reject & send email", exactly like every other reason.
- No DB migrations (rejection reasons are free-text in `startups.rejection_reason`).

## Files touched

- `src/routes/admin.tsx` — add radio option, tighten `csp_blocked` hint, add optional card chip.
- `supabase/functions/send-email/index.ts` — add `csp_frame_blocked` REASONS entry, tighten `csp_blocked` heading/reasonLine.
