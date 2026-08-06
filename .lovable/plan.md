# Fix: payment taken, application never submitted

## You're right about the flow

The apply flow is: fill the form → install the script → pay → Dodo redirects back to `/apply?paid=true` → the page verifies the payment → **auto-submits the application**. So a payment with no application means the auto-submit step failed silently.

## What actually happened

The payment from **jared@pypes.dev** (19:09 UTC today) is recorded as succeeded, but its `consumed_at` is still empty — the prepaid credit was never redeemed. That pinpoints where it broke: the failure happened *before* the credit-consuming step in the submit function.

The most likely cause is the form draft being lost across the Dodo redirect. The draft is stored in **sessionStorage**, which does not survive if the payment page opens in a new tab/window, the browser is switched, or the tab is restored. On return, the page verifies the payment fine, then calls submit with an empty name/URL/description — the validation call throws, and because it is not wrapped in error handling, the whole submit dies with **no toast, no error, and the spinner stuck on**. From the founder's side: he paid and nothing happened.

Two smaller contributors:
- If the payment verification retries all fail, the page shows an info toast and just stops — the credit is stranded with no next step offered.
- Nothing anywhere surfaces "this person paid and never listed", so it went unnoticed until you checked.

Good news: the money and the credit are safe. `consume_prepaid_listing` picks up the oldest unconsumed payment, so when he completes the form he will not be charged twice.

## The fix

**1. Make the draft survive the payment round-trip**
Store the apply draft in localStorage instead of sessionStorage (cleared on successful submit, as today). It then survives new tabs, restored sessions, and returning hours later on the same browser.

**2. Never fail silently on return from payment**
Wrap the submit path in proper error handling: validation failures and insert errors show a clear toast and always clear the loading state. If the draft is missing when the payment comes back verified, do not attempt a doomed submit — instead land the user on step 1 with a visible banner: *"Your payment went through. Re-enter your startup details to finish — you won't be charged again."*

**3. Show the pending credit whenever they open /apply**
If the signed-in user has an unconsumed successful payment, show that same banner at the top of the apply page regardless of how they arrived. Anyone in this situation can self-recover by just visiting /apply.

**4. Admin visibility**
Add a "Paid, no listing yet" panel to the admin dashboard listing unconsumed successful payments older than ~10 minutes, with founder email, time since payment, and payment ID, so you can nudge them. The admin-only RPC for this already exists.

**5. Recover today's payment**
No data change needed — jared@pypes.dev will see the banner and can submit without paying again. Optionally send him a short note pointing him back to /apply.

## Technical notes

- `src/routes/apply.tsx`: swap `sessionStorage` for `localStorage` on `DRAFT_KEY`; guard `schema.parse` in `onSubmit` with try/catch plus `setLoading(false)`; gate `autoSubmitPending` on the draft actually having name/url/description; add the prepaid-credit banner driven by the existing `hasPrepaid` gate data.
- `src/routes/admin.tsx`: new panel calling `admin_orphan_payments(10)` through the existing admin server-function path, styled like the "Recently removed" card.
- No changes to checkout, the webhook, or `consume_prepaid_listing` — those all behaved correctly.
