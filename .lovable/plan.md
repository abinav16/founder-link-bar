## Goal
Replace the plain "Application submitted!" toast with a richer Sonner toast that reassures the founder and gives them a clear next step, while keeping the existing redirect to `/dashboard`.

## Changes
1. **Update `src/routes/apply.tsx`**
   - Replace `toast.success("Application submitted!")` in the `onSubmit` function with a richer Sonner toast:
     - **Title:** "Application submitted!"
     - **Description:** "We review every application within 24 hours. You'll get an email once you're approved."
     - **Action button:** "Go to dashboard" that triggers the same `/dashboard` navigation.
     - **Duration:** 6 seconds so it's readable before/after the redirect.
   - Keep the existing `navigate({ to: "/dashboard" })` immediately after the toast so behavior doesn't change.

## Verification
- Run the TypeScript check (`bunx tsc --noEmit`) to ensure the Sonner API usage is valid.
- No database or server changes required.

## Outcome
Founders still land on the dashboard, but see a polished, informative confirmation toast instead of a one-liner.