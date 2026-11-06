# Install page (step 2): real payment + redesign

## What's wrong today
- On step 1 founders can pick Guaranteed clicks ($49–$299) and a Sunday newsletter spot, but step 2 never charges for them. The button only says "Submit application", or "Pay $9.99" for an extra startup. Paid choices just get saved and never collected.
- Only three things can be charged right now: the $9.99 additional listing, the Supporter plan and the featured subscription. There is nothing to charge for click packs or newsletter spots.
- Step 2 still uses the old black/white style: hardcoded colors, progress pills and a plain button. It doesn't show the order from step 1.

## Payment plan
1. **One checkout for the whole order.** After the install is verified, the button says "Pay $X & submit". X is the total from step 1: extra-listing fee + click pack + newsletter spot. Free orders keep "Submit application".
2. **Charging the extra items through Dodo (the payment service).**
   - One Dodo product per click pack (100 / 250 / 500 / 1000).
   - One flexible-price newsletter product. The price comes from the live founder count, worked out on the server. The browser never sets it.
   - The checkout is built from these products together. Prices are always recalculated on the server from the saved plan.
3. **Newsletter date is claimed before payment.** The server holds the chosen Sunday as "pending" before it opens checkout. The current one-booking-per-Sunday rule makes a double booking fail. If the payment fails or expires, the date is released (payment notice + 30-minute expiry).
4. **After payment.** The payment notice marks the order as paid, gives the clicks to the startup's featured slot and confirms the newsletter booking. The listing is still submitted for review as it is today. Returning from checkout shows a "Payment received, under review" state.
5. **Edge cases.** Supporter stays trial-only. Prepaid credits and resubmissions skip the listing fee. If the founder cancels at checkout, they come back to step 2 with everything kept.

## Redesign of step 2 (same look as step 1)
- Left side: install steps as numbered cards: 1 Copy code, 2 Verify live (big status card with clear colors), 3 Signup tracking (optional, folded away).
- Right side: a sticky **Order summary** card, the same as step 1. It lists the items, total due today, the pay/submit button and a short line about trust and refunds. It sits at the bottom on phones.
- Startup chip at the top with an Edit link, step header "Install. Then go live.", and colors switched to the site's color settings. The setup guides and troubleshooting stay underneath as fold-out sections.

## What I need from you
- Create the 4 click-pack products and 1 flexible-price newsletter product in Dodo, then give me their product IDs. I'll ask for them as secure secrets. Or tell me if you'd rather I set the prices another way.

## Technical notes
- `create-dodo-checkout`: new `kind: "order"`. It reads `startups.checkout_plan`, gets prices from shared constants and the audience count, builds `product_cart`, and adds metadata `order_id`.
- New table `checkout_orders` (owner can only read; only the server writes): items, total, status, newsletter booking id, expiry.
- `dodo-webhook`: handles paid/failed for `order`, releases expired newsletter claims.
- Tests: order total and line items per plan; claimed-date conflict.
