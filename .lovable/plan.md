## Problem

On `/apply`, when a user with an existing startup pays for an additional listing:
1. Dodo redirects back to `/apply?paid=true&...` and the page **flashes Step 1 first**, then jumps to Step 2 (because `step` initializes to `1` and only switches to `2` after a `useEffect` runs post-mount).
2. The "paid" gate lives only in URL params + client state. If the user reloads, navigates back, or re-enters Step 1, `existingCount >= 1` will push them through the **payment screen again** — they have no record that they've already paid.
3. Payment is not verified server-side. Anyone could append `?paid=true` and skip the fee.

## Fix

### 1. Eliminate the Step 1 flash (`src/routes/apply.tsx`)
Initialize `step`, `name`, `url`, `desc` synchronously from `window.location.search` in the `useState` initializer (lazy init), instead of doing it inside a `useEffect`. The page will render Step 2 immediately on the post-payment redirect — no flash.

### 2. Track paid-but-unused listings server-side
Add a server-verified record of completed payments that haven't been "consumed" by inserting a startup yet.

**Migration** — add a `consumed_at` column + index to the existing `public.payments` table:
```sql
ALTER TABLE public.payments ADD COLUMN consumed_at timestamptz;
CREATE INDEX payments_user_unconsumed_idx
  ON public.payments(user_id) WHERE status = 'succeeded' AND consumed_at IS NULL;
```

### 3. Verify payment on return (new edge function `verify-dodo-payment`)
- Input: `payment_id`
- Calls Dodo `GET /payments/{id}` with `DODO_PAYMENTS_API_KEY` on the same `live`/`test` base URL the checkout function uses.
- If `status === "succeeded"` and the customer email matches the authed user, upsert into `public.payments` with `status = 'succeeded'`, `consumed_at = NULL`. Idempotent on `dodo_payment_id` unique key.
- Returns `{ ok: true }`.

### 4. Pass `payment_id` back through the redirect (`create-dodo-checkout` + `apply.tsx`)
- Update `return_url` in `apply.tsx` to include `{payment_id}` placeholder Dodo will substitute, so the redirect becomes `/apply?paid=true&payment_id=...&name=...&url=...&desc=...`.
- On `/apply` mount, if `paid=true` and `payment_id` present, call `verify-dodo-payment` once. If verification succeeds, set `step = 2` and stash `verifiedPaymentId` in state. If it fails, toast an error and stay on Step 1.

### 5. Use the unconsumed payment as the gate (`apply.tsx` + `create-dodo-checkout`)
- On mount, also query `public.payments` for the user: any row with `status='succeeded' AND consumed_at IS NULL` means they have a prepaid slot.
- `goToStep2` logic becomes:
  - If `existingCount === 0` → Step 2 (free first listing).
  - Else if a prepaid unconsumed payment exists → Step 2 (skip payment screen).
  - Else → payment screen.
- On successful `onSubmit` (insert into `startups`), in the same call also mark the prepaid payment as consumed: a new server function (or RPC) that sets `consumed_at = now()` on the oldest unconsumed succeeded payment for that user. Wrap both in a Postgres function so they're atomic and protected by RLS via `SECURITY DEFINER`.

### 6. Handle the "user navigates Back from payment" / refresh cases
Because the gate is now server-side, refreshing `/apply`, going back to Step 1 after paying, or losing the URL params no longer re-charges the user — the unconsumed payment row keeps them in the prepaid path until they actually submit a new startup.

## Out of scope
- No Dodo webhook in this pass (verification on return is sufficient since Dodo will only redirect after a real `succeeded` charge, and we re-confirm via API). A webhook can be added later for resilience if a user closes the tab before redirect.

## Files touched
- `src/routes/apply.tsx` — lazy `useState` init from URL, verify call on return, prepaid-slot lookup, consume-on-submit.
- `supabase/functions/create-dodo-checkout/index.ts` — add `{payment_id}` to `return_url`.
- `supabase/functions/verify-dodo-payment/index.ts` — new.
- `supabase/migrations/<new>.sql` — `consumed_at` column, index, `consume_prepaid_listing()` SECURITY DEFINER function + GRANT EXECUTE to `authenticated`.