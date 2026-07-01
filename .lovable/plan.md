## Flow audit — rejected startup "Fix & resubmit"

I traced `src/routes/apply.tsx` (resubmit URL → prefill → step 2 → submit) and `src/routes/_authenticated/dashboard.tsx` (rejection banner → link). Two issues remain.

### Issue 1 — Payment gate wrongly triggers on resubmit (real bug)

`refreshGateData()` counts non-rejected startups. If a founder already has one approved startup **and** a separate rejected one they're fixing, `existingCount = 1` and the Step 2 CTA becomes **"Pay $9.99 & submit →"**. But `onSubmit()`'s resubmit branch only does an `update` back to `pending` — no new row, no slot consumed. Charging here is wrong.

Fix: when `resubmitId` is set, force `needsPayment = false` in the Step 2 CTA logic so the button reads **"Submit application"** and calls `onSubmit()` directly. `onSubmit()` already handles the resubmit branch correctly.

### Issue 2 — Resubmit forces a redundant "Check now" click (small UX)

On resubmit the same `startupId` is reused, so the script that was already installed on the founder's site is still valid. Today they land on Step 2 with `verifyStatus === "idle"` and must click **Check now** before the submit button enables.

Fix: when the resubmit prefill effect populates the form, kick off `checkInstallation()` once so verification runs automatically. If it comes back `found`, submit unlocks; otherwise the existing amber "Not found yet" message guides them, unchanged.

### Everything else checks out

- `refreshGateData` correctly excludes rejected rows, so a founder whose only submission was rejected still gets the free first-listing path.
- Resubmit path in `onSubmit` updates in place with `status: 'pending'`, clears `rejection_reason`, and scopes by `user_id` — RLS-safe.
- `prevent_user_status_change` trigger allows the owner to reset to `pending`.
- Dashboard rejection banner reads `rejection_reason` and links with `search={{ resubmit: startup.id }}` — matches `readInitialFromUrl()`'s `p.get("resubmit")`.
- Ownership + status checks in the resubmit prefill effect prevent hijacking another user's row or resubmitting a non-rejected one.
- Draft persistence (`DRAFT_KEY`) is cleared on successful submit.

### Files touched

- `src/routes/apply.tsx` — gate override for `resubmitId`, auto-run `checkInstallation()` after prefill.

No DB, edge-function, or dashboard changes needed.
