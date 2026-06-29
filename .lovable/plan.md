## Problem

`supabase/functions/send-email/index.ts` currently sends from `hello@startupbar.dev`, which isn't verified in Resend. Every send (founder confirmation + admin notification) is failing with a 403 `validation_error`, which is why no email arrived for the `vouchmeapp` submission.

## Fix

Change the `FROM` constant in `supabase/functions/send-email/index.ts`:

```ts
const FROM = "StartupBar <hello@startupbar.co>";
```

That's the only change — all template logic stays the same. Once redeployed, the queued admin + founder emails for new submissions will deliver normally (the existing `RESEND_API_KEY` is already scoped to `startupbar.co`).

## Verify

After the change, trigger a test send via the `send-email` function and confirm the founder + admin emails arrive for the next submission. Note: prior failed sends (including `vouchmeapp`) won't be retried — they were not queued, just rejected at call time. I can manually re-fire the `admin-new-application` email for `vouchmeapp` so you get that one notification.