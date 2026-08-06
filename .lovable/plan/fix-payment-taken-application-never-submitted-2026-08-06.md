# Fix: payment taken, application never submitted

## It is not a redirect problem

The redirect back from Dodo worked. Evidence: the payment-verification function booted several times between 19:09 and 19:10 UTC — that is the retry loop that only runs when the browser lands back on `/apply?paid=true`. So he paid, came back, and the page verified the payment.

What failed is the **very last step**: the automatic submit.

## Why the submit never happened

The return flow is a chain, and every link after verification is silent if it doesn't fire:

```text
Dodo redirect  ->  verify payment  ->  refresh "has prepaid credit"  ->  auto-submit form
     OK               OK (ran)              ???                            never ran
```

The database proves the last link never ran: the payment row exists with status succeeded, but `consumed_at` is still empty — and consuming the credit is the *first* thing the submit does. So it died before that point. Three things can kill it there, and all three fail with no error on screen:

1. **The credit flag never flipped.** Auto-submit only fires once the page re-reads the user's payments and sees an unconsumed credit. If that re-read races the webhook or errors, the page just sits there forever waiting — no message, no retry.
2. **The saved form draft was empty.** The draft is kept in sessionStorage. If it was lost (new tab from the checkout, restored session, different browser), the submit calls validation with empty fields, which **throws**. That throw is not caught, so there is no toast and the button stays spinning.
3. **Verification returned "not yet".** If Dodo hadn't flipped the payment to succeeded within the 4 retries, the page shows an info toast and stops — and then the webhook records the payment a moment later, leaving the credit stranded with nobody to redeem it.

In every case the user's experience is identical: paid, sent back, and nothing visibly happened. His money and credit are safe — `consume_prepaid_listing` will pick up that unconsumed payment whenever he submits, so he won't pay twice.

## The fix

**1. Never leave the user on a dead end**
Catch errors in the submit path: validation failures and insert errors show a clear toast and always stop the spinner. Cap the "waiting for credit" state with a timeout instead of waiting forever.

**2. Make the draft survive the payment round-trip**
Move the apply draft from sessionStorage to localStorage (still cleared on successful submit). It then survives new tabs, restored sessions, and coming back later on the same browser.

**3. Self-recovery banner**
Whenever a signed-in user with an unconsumed successful payment opens `/apply`, show: *"Your payment went through — finish your listing below. You won't be charged again."* If the draft is gone, drop them on step 1 with the fields blank rather than attempting a doomed silent submit. This alone rescues anyone who hits any of the three failure modes.

**4. Admin visibility**
Add a "Paid, no listing yet" panel to the admin dashboard listing unconsumed successful payments older than ~10 minutes, with founder email, payment ID, and time since payment, so you can nudge them the same day.

**5. Today's payment**
No data fix needed — jared@pypes.dev will see the banner and can submit for free. Optionally email him a link to `/apply`.

## Technical notes

- `src/routes/apply.tsx`: swap `DRAFT_KEY` storage to localStorage; wrap `schema.parse` and the insert in try/catch with `setLoading(false)`; add a timeout + user-visible fallback around the `autoSubmitPending` / `hasPrepaid` wait; render the prepaid banner from the existing gate data.
- `src/routes/admin.tsx`: new panel calling the existing admin-only `admin_orphan_payments(10)` RPC, styled like the "Recently removed" card.
- No changes to checkout, the Dodo webhook, or `consume_prepaid_listing` — those all worked correctly.
