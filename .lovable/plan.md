# Email compliance cleanup

## What I found

I checked the mailing setup against the account list and the unsubscribe records.

- The account list holds 380 people. None are marked as deleted right now, which means past "deleted accounts" were never actually removed: the privacy page tells people to email you to delete their account, and that removal is manual. If only the startup listing was removed, the person stayed in the mailing audience.
- There is no way for someone to delete their own account in the app, so this will keep happening.
- Bounces and spam complaints are never recorded. Only 10 opt outs exist, all from the unsubscribe link. If an address hard bounces or someone marks a message as spam, they stay on the list and get mailed again in the next batch. This is the most likely reason the sending account was flagged.
- 9 accounts never confirmed their email address and are still mailed.
- Broadcast sends are not logged anywhere, so there is no record of who was mailed, when, or what failed.

Good news: the unsubscribe link, one click unsubscribe headers, the opt out footer, and the opt out check before sending all work correctly.

## What I will do

1. **Record bounces and complaints automatically.** Add a secure endpoint that receives delivery events from the email service and adds hard bounces and spam complaints to the opt out list immediately, so they are never mailed again. You will need to add that endpoint once in your email provider dashboard; I will give you the exact address.
2. **Clean the current list.** Import past bounce and complaint history from the email provider into the opt out list before the next send.
3. **Self serve account deletion.** Add a Delete my account option in Account, with a confirmation step. It removes the person's listings and data, deletes the login, and permanently adds their address to the opt out list so a re-import can never resurrect them.
4. **Stop mailing addresses that should not be mailed.** The recipient builder will skip accounts that are deleted, suspended, or never confirmed their email, on top of the existing opt out check.
5. **Log every send.** Each broadcast message is recorded with recipient, subject, batch, status, and failure reason, so you can prove compliance and spot bad addresses early.
6. **Admin visibility.** The broadcast panel will show opt outs, bounces, complaints, and skipped addresses for the selected audience before you press send.
7. **Update the privacy page** to describe self serve deletion and how opt outs are handled.

## Technical notes

- New route `src/routes/api/public/email-events.ts` verifying the provider webhook signature, writing `suppressed_emails` rows with reason `bounce` or `complaint`. The existing `suppressed_emails` check constraint allows `unsubscribe`, `bounce`, `complaint`, so no schema change is needed there.
- Recipient builder in `supabase/functions/send-email/index.ts`: filter out `deleted_at`, `banned_until`, and `email_confirmed_at is null` from `listUsers`, in addition to the suppression set. Same filter applied in `send-weekly-digest`.
- Per message insert into `email_send_log` with `template_name: 'admin-broadcast'`, status `sent`/`failed`, and batch metadata.
- Account deletion: authenticated server function that deletes owned `startups` and dependent rows, inserts a permanent suppression row, then calls `auth.admin.deleteUser`.
