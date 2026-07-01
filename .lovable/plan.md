## Why the false-positive emails are happening

The widget loader sends **one heartbeat 1.5s after injection**. That single snapshot decides whether to strike + email. Common transient conditions at t=1.5s that wrongly flag "hidden":

- Splash / cookie banner / hero overlay still covering the top strip → `elementFromPoint` returns the overlay, not the iframe.
- Iframe hasn't first-painted, `rect.height` briefly 0.
- Sticky header stacked above the widget for a moment before `sweepFixedElements()` shifted it.
- A wrapping element with `overflow: hidden` (very common) that momentarily clips during layout.

Server-side (`widget.heartbeat.ts`), the **very first** `visible=false` for an approved startup writes `widget_hidden_at`, `strike_count=1`, and immediately fires the warning email — no confirmation, no grace period.

## Plan

### 1. Kill the automated emails permanently
In `src/routes/api/public/widget.heartbeat.ts`:
- Remove all `sendEmail(...)` calls (warning, suspension, ban).
- Remove all automatic status flips (`status: "rejected"`, `banned: true`, `rejection_reason: "widget_hidden*"`).
- Keep only bookkeeping: `widget_currently_visible`, `widget_last_heartbeat_at`, `widget_hidden_at`, `strike_count` — so the admin panel still shows accurate widget health and you can act manually.
- Drop the `warningEmail` / `suspensionEmail` / `banEmail` helpers and the `RESEND_API_KEY` / `sendEmail` code (dead code after removal).

No auto-emails will ever be sent from the heartbeat endpoint again. Manual reject/warn from `/admin` is untouched.

### 2. Harden client-side visibility detection
In `public/widget/loader.js`:
- Delay the first heartbeat from **1.5s → 8s** so splash screens, cookie banners, and framework hydration have settled.
- Send a **confirmation heartbeat at 30s**, then every 5 minutes while the tab is visible (`document.visibilityState === 'visible'`).
- Only report `visible=false` when the widget has been hidden across **two consecutive local samples**; otherwise report `visible=true`. This eliminates single-snapshot false positives even before the server sees them.
- Tighten `isWidgetVisible()`:
  - Remove the `overflow: hidden` parent bail-out (too many false positives from normal wrappers with non-zero size).
  - For the `elementFromPoint` check, accept the hit when the covering element has `pointer-events: none`, `opacity < 0.1`, or is `aria-hidden="true"`.
  - Wait for the iframe's `load` event (or `contentDocument.readyState === 'complete'`) before the first sample.

## Files changed
- `src/routes/api/public/widget.heartbeat.ts` — strip all email sending and auto status/ban logic; keep bookkeeping only.
- `public/widget/loader.js` — delayed + repeated + confirmed heartbeats, looser `isWidgetVisible()`.

No changes to `send-email`, admin panel, tracking, or any other widget behavior.
