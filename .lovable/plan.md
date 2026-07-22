## Root cause

Reproducing `create-dodo-checkout` against Dodo's live API returns:

> `Product id 'pdt_0NhWYhoEbLJW16TY9Eicc' does not exist`

The product hardcoded in the edge function no longer resolves in Dodo. Solomon (and every other founder trying to buy a listing since it broke) hits a generic "Could not create payment session" toast — that's the "payment processor is not working" he emailed about. The correct current live product ID is `pdt_0NhWTstgLoJiLAByVyHaR`.

## Plan

1. **Store the product ID as a Supabase secret** — request `DODO_PRODUCT_ID` via `add_secret` so future rotations don't need a code change.
2. **Update `supabase/functions/create-dodo-checkout/index.ts`** to read `Deno.env.get("DODO_PRODUCT_ID")` instead of the hardcoded `pdt_0NhWYhoEbLJW16TY9Eicc`. Fall back to a clear 500 with `"Missing DODO_PRODUCT_ID"` if unset, matching the existing `DODO_PAYMENTS_API_KEY` check.
3. **Deploy** the edge function.
4. **Verify** by calling `create-dodo-checkout` via `curl_edge_functions` and confirming a real `payment_link` comes back.
5. **Reply to Solomon** — I'll draft a short warm email letting him know the checkout is fixed and he can retry from his dashboard's "Add another startup" flow, apologizing for the friction.

## Not doing

- Not touching `verify-dodo-payment` (the verify path uses payment IDs, not product IDs — unaffected).
- Not changing `DODO_MODE` — live mode is correct; the product just needed the new ID.
- Not refunding or manually granting Solomon a free listing since he explicitly said he's happy to pay.
