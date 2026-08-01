## What's wrong

When profile fields were moved into their own `profiles` table, the table was created with row-level security policies but **no table-level permissions were granted** to signed-in users. Confirmed: `public.profiles` currently has zero grants for any role.

Effect:
- Reading the profile still works, because the account page loads it through a `get_my_profile` function that runs with elevated rights.
- **Saving** goes straight to the table, so every save — display name, X handle, and profile picture — is rejected. That's the "new row violates row-level security policy" toast Silford hit. This affects every user, not just him.

Second, smaller issue: the `avatars` storage bucket has insert/update/delete rules but **no read rule for the owner**. Replacing an existing photo (an upsert) can be rejected for that reason, so the first upload works and later replacements fail.

## The fix

1. Database migration:
   - Grant signed-in users the ability to read/insert/update their own rows on `public.profiles`, plus full access for internal server operations. RLS policies already restrict each user to their own row, so this doesn't widen access.
   - Add an owner read policy on avatar files in storage so replacing a photo works.
2. No frontend changes needed — the account page code is already correct.

## Verification

- Confirm grants exist on `profiles`.
- Sign in and save a display name, X handle, and a new profile picture end-to-end, confirming the row updates and the founder name/photo shows on the public startup page.
- Re-run the security linter to make sure nothing was over-granted.

## Follow-up

Once verified, you can reply to Silford that it's fixed and he can re-save his photo.
