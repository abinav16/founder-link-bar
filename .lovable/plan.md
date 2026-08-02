## Goal

Show the founder's name, profile picture, and email address for each application in the admin panel — visible to the admin only, never readable by any other signed-in or anonymous user.

## What exists today

- The admin applications table is fed by `admin_all_startups()`, a privileged function that already refuses to run unless the caller's verified email is the admin's. It returns startup rows only — no founder identity.
- Founder name/photo live in `profiles` (with fallback to the account's login metadata); the email lives only in the accounts table, which app users can never query directly.
- The existing public founder lookup deliberately returns name + photo only, never email. That stays untouched.

## The change

1. **New admin-only database function** `admin_founder_info(_user_ids uuid[])` returning user id, full name, avatar URL, and email.
   - Same email gate as the other admin functions: raises "Forbidden" for anyone else.
   - Execute permission revoked from anonymous and public; granted only to signed-in callers, where the in-function gate does the real check.
   - No new table permissions, no new read policies — nothing becomes readable by ordinary users.

2. **Admin page**: after loading applications, fetch founder info for the listed owners in one call and render a new "Founder" column — small round avatar (initial fallback), name, and email below it with a click-to-copy shortcut, matching the copy behaviour already used in the "Recently removed" panel. Column collapses sensibly on mobile (hidden below `md`, founder shown inline under the startup name instead).

## Security notes

- Email is never exposed through any public route, policy, or the existing public founder function.
- The founder call is gated identically to the existing admin data path, so a non-admin who forces the admin page open still gets "Forbidden" and no rows.
- After the migration, re-run the database security linter to confirm nothing was over-granted.
