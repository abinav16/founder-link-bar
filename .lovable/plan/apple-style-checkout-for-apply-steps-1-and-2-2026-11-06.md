# Apple-style checkout for /apply (Steps 1 and 2)

## Goal
Turn /apply into a calm, premium, hand-crafted checkout in the StartupBar black-and-white theme. Each option feels considered and honest — founders see exactly what they get before choosing. Free stays the default so free signups are never discouraged.

## New flow

```text
Step 1  Your startup      name, site, description, category (live bar preview stays)
Step 2  Choose your plan  Free / Clicks boost / Newsletter / No Bar Supporter
Step 3  Install           snippet, AI prompt, verify, email-me-snippet (existing)
Step 4  Review & pay      order summary -> Dodo checkout (skipped for Free)
```

## Plan options (proposed prices — please confirm or change)

1. **Free — Network listing**  $0. Show the bar, earn impressions back. Default selected.
2. **Clicks boost (guaranteed clicks)** — pay per verified click, featured slot stays live until the clicks are delivered:
   - 100 clicks — $49 ($0.49/click)
   - 250 clicks — $99 ($0.40/click, save 18%)
   - 500 clicks — $179 ($0.36/click, save 27%) — "Most chosen"
   - 1,000 clicks — $299 ($0.30/click, save 39%)
   A smooth slider/segmented picker morphs the price, per-click rate and savings live.
3. **Newsletter sponsor spot** — $0.25 per founder on the list. Price is computed live from the real subscriber count (about 260 today, about $65), with a preview of the sponsor card inside the Sunday digest. Can be added on top of Free or Clicks boost.
4. **No Bar Supporter** — existing $999/year, 7-day free trial, moved into its own clearly separated card (no longer mixed with placement buttons).

Bar placement (top/bottom) moves next to the preview on Step 1, separate from paid choices.

## Design direction
- Apple-store feel: large confident type, generous white space, one decision per screen section, soft glass cards, thin hairline borders, monochrome with the existing gold featured accent for paid boosts.
- Motion: cards lift and settle on select, numbers roll when prices change, a sticky order summary that slides up on mobile, step transitions crossfade and slide; all respect reduced-motion.
- Every card lists "What you get", "How it is measured" (verified clicks, bot-filtered), and a guarantee line: "Not delivered? Slot stays live until it is."
- Live order summary on the right (desktop) / bottom sheet (mobile) with total and "Pay later after approval" note.

## Behaviour rules
- Payment happens after install verification; boosts activate when the listing is approved.
- Clicks counted only after the bot filter; featured slot ends when the purchased count is reached.
- Newsletter price = current active subscriber count x $0.25, locked at checkout.
- Existing drafts, resume links, guest email handoff and track-mode protection keep working.

## Technical section
- Split apply.tsx into components: `ApplyStepper`, `PlanPicker`, `ClickPackCard`, `NewsletterCard`, `SupporterCard`, `OrderSummary`; tokens and keyframes in src/styles.css.
- New pricing module `src/lib/checkout-plans.ts` (packs, per-click math, newsletter math) with vitest tests for each price rule.
- Draft gains `plan` and `addons` fields (backward compatible).
- Database: `click_boosts` (startup, clicks_purchased, clicks_delivered, status) and `newsletter_sponsorships` (startup, send date, recipients, price); service-only writes, owner read.
- Dodo: one-time products per pack plus a dynamic newsletter amount; webhook marks boosts paid; featured rotation reads remaining clicks instead of 30-day expiry for click-pack slots (existing $79 monthly subscribers untouched).
- Weekly digest template gets the sponsor card (built in the follow-up already agreed).
- Verify with Playwright at desktop and 390px.
