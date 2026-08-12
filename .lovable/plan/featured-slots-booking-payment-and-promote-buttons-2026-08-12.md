# Featured slots: booking, payment, and promote buttons

Sell the 8 side rail slots (4 left, 4 right) as monthly featured placements, bought from inside the app with the existing Dodo checkout.

## What the user sees

**1. Clicking an empty slot**
Opens a dialog instead of navigating to pricing. The dialog has three states:

- *Choose*: a live slot map (8 tiles, left rail 1-4 and right rail 1-4) showing which are taken and which are free, the monthly price, and a startup picker if the member has more than one approved startup. Taken tiles are disabled and show "Frees up in N days".
- *Paying*: after "Book this slot" the browser goes to Dodo. On return the dialog reopens automatically in a verifying state.
- *Success*: a short check-mark animation, "You're live in slot 3", then the dialog closes and the rail refreshes so their card is already in place.

**2. Not signed in**
The dialog shows a sign-in step first (Google + email), returning to the same slot after auth. No redirect away from the page.

**3. Signed in but no approved startup**
The dialog explains slots are for network members and links to Apply.

**4. Slot already taken while they were paying**
Payment is never lost. They get the next free slot automatically, or if the rail is full, they are placed at the top of the waitlist with a credit and told when it frees up.

**5. All 8 slots taken**
Slots show as booked, the dialog switches to a waitlist form (startup + email prefilled, one click). No money is taken. When a slot expires, the first person on the waitlist gets an email with a booking link that holds the slot for 24 hours.

**6. Promote buttons**
A gold "Promote" button on each startup card in Dashboard and Account > Your startups. It opens the same dialog with that startup preselected. If that startup already has an active slot, the button becomes "Featured until Sep 12" with an option to renew or cancel auto-expiry.

**7. Featured treatment**
An active booking makes the startup's card gold across the rail, Trending, New this week, the network list, and the leaderboard, using the existing `sb-sponsored` styling.

## Rules

- Members only: must be signed in and own an approved startup.
- One flat monthly price, one slot per startup at a time.
- 30 days from payment confirmation; expiry is automatic, no auto-renew for v1.
- Featured status never changes the widget delivery algorithm or impression counts. It is presentation only, so reciprocity stays honest.

## Technical notes

**Database**
- `featured_slots`: `id`, `slot_index` (1-8), `startup_id`, `user_id`, `starts_at`, `expires_at`, `dodo_payment_id`, `status` (pending | active | expired | cancelled). Partial unique index on `slot_index` where `status = 'active'` so two payments cannot land on the same slot.
- `featured_waitlist`: `id`, `startup_id`, `user_id`, `created_at`, `notified_at`, `claim_token`, `claim_expires_at`.
- Public read for active slots via a narrow `TO anon` SELECT view exposing only startup id and slot index. Owner-scoped read/insert policies for the rest. GRANTs for `anon`, `authenticated`, `service_role` as usual.

**Payment**
- New Dodo product for the monthly featured slot; reuse `create-dodo-checkout` with a `product` parameter (`listing` | `featured`) instead of a second function, keeping the existing return_url allowlist and JWT-derived email.
- Checkout metadata carries `user_id`, `startup_id`, `slot_index`, `kind: featured`.
- `dodo-webhook` becomes the source of truth: on `payment.succeeded` with `kind: featured`, it inserts the `featured_slots` row (or reassigns to the next free slot if the chosen one was taken) and marks the payment consumed.
- Return URL comes back to the current page with `?featured_payment_id=...`; the dialog verifies through the existing verify path and polls briefly until the webhook row exists, so a slow webhook still ends in the success animation instead of a dead end.
- Expiry handled by a scheduled call to a new `/api/public/featured-expire` route that flips due rows to `expired` and emails the first waitlist entry.

**Frontend**
- `FeaturedBookingDialog` component holding all states, driven by a `useFeaturedSlots()` query.
- `SponsoredRail` reads active bookings and renders a real featured card (logo, startup name, founder, one-liner) for taken slots, keeping the current "Book this slot" design for free ones.
- Promote button added to the startup cards in `_authenticated/dashboard.tsx` and `_authenticated/account.tsx`.

## Open item

Monthly price is not set yet. I will use a placeholder constant in one file until you name the number.
