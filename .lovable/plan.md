## New flow

Move payment from a separate "payment" step into Step 2, gated on live script detection.

### Step 1 (unchanged UX, simpler logic)
- Collect name / url / one-liner.
- "Next" always goes to Step 2. No payment gate, no `step === "payment"` branch.
- Remove the `setStep("payment")` logic in `goToStep2`.

### Step 2 — install + verify + submit/pay
1. User pastes the embed code and clicks **Check now**.
2. Until `verifyStatus === "found"`, the bottom CTA is **disabled** with helper text "Install the script and verify it's live to continue."
3. Once detected:
   - **First startup (free):** CTA becomes `Submit application` → existing `onSubmit()` path → toast → `navigate({ to: "/dashboard" })`.
   - **Additional startup (existingCount ≥ 1 && !hasPrepaid):** CTA becomes `Pay $9.99 & submit →`. Clicking it calls `handlePayment()` which redirects to Dodo. Return URL stays `/apply?paid=true&...&payment_id={payment_id}`.
4. On return from Dodo with `paid=true`:
   - Render Step 2 (already does via `readInitialFromUrl`).
   - Run the existing `verify-dodo-payment` effect — on success, `refreshGateData` flips `hasPrepaid=true`.
   - Auto-trigger `onSubmit()` once: it consumes the prepaid slot, inserts the startup, sends emails, then `navigate({ to: "/dashboard" })` (the account/overview page).
   - On verification failure: toast + stay on Step 2 (don't bounce to Step 1).

### Cleanup
- Remove the entire `step === "payment"` JSX block and the `"payment"` value from the `step` union (now `1 | 2`).
- Remove the step-1 payment gate; keep `existingCount` / `hasPrepaid` only to decide Step 2's CTA label and behavior.
- The post-payment auto-submit needs the `name/url/desc` from the URL (already restored by `readInitialFromUrl`) and the `startupId` (regenerated per mount — fine since the row hasn't been inserted yet).

### Files touched
- `src/routes/apply.tsx` — only file. No backend, migration, or edge function changes needed (`verify-dodo-payment` + `consume_prepaid_listing` already exist and stay as-is).

### Result
- Free listing: fill form → install + verify → submit → dashboard.
- Paid listing: fill form → install + verify → pay → return → auto-submit → dashboard.
- Users cannot pay without a verified live script, and cannot submit a paid listing without paying.
