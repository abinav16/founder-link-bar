# Jared / lamboapp.com — recovery

## What the data shows

- Payment `pay_0NkpAVbjBt02FM9GRG1l0` ($9.99, Aug 6 19:09 UTC) — **succeeded, not consumed**. No money lost, credit still valid.
- Startups table: only `Career Jumpship` under his account. No lamboapp.com row.
- Application events: no record for lamboapp.com — meaning the submit never reached the server.

So **no, we do not have the details he typed**. The form draft lives only in the browser (localStorage/sessionStorage); nothing is sent to us until Submit succeeds. All we know from the email is the URL: `lamboapp.com`.

## Options to close this out

**A. Create it for him from the live site (recommended)**
Pull the startup name, tagline and logo from lamboapp.com, insert the listing under his account as `pending`, mark his payment consumed, and tell him it's in review and he can edit the wording from his dashboard.

**B. Ask him for the details**
Reply asking for the display name and one-line description, then create it manually.

## Draft reply (works for either option)

> Hi Jared,
>
> Sorry about that — I checked and your $9.99 payment went through fine, but the listing form didn't submit after the redirect back from checkout, so lamboapp.com never got created. That bug is fixed now.
>
> I've gone ahead and created the lamboapp.com listing on your account using the details from your site — it's in review and you can edit the name/description any time from your dashboard at startupbar.co/dashboard. You won't be charged again.
>
> Thanks for flagging it,
> Daniel

(If you prefer option B, swap the middle paragraph for: "Send me the name and a one-line description you'd like shown and I'll create it for you right away — your payment credit is still on your account.")

## Technical steps if you pick A

1. Fetch `https://lamboapp.com` to read the title/meta description and favicon.
2. Insert into `startups`: `user_id = 9cd7deee-4cee-4a7b-b9bb-ee4c6e7e08b5`, name, `website_url`, description, `status = 'pending'`, logo_url.
3. Set `consumed_at = now()` on payment `53eef644-046e-40de-a8f5-3925e249084a` so the credit isn't double-spent.
4. Confirm the new listing shows in Admin's applications queue.

No code changes needed — the underlying bug (draft lost across the payment redirect, silent submit failure) was already fixed earlier today.
