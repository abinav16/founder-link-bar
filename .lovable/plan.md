## Problem

The new `PreShip Validation` application IS in the database with `status='pending'` — but it belongs to a different user (`patmeeker+preship@gmail.com`). The admin page shows `All: 2` (only your own two approved startups), not 3.

Cause: Row-Level Security on `public.startups` only lets a user read:
- their own rows, or
- rows where `status='approved'`.

There is no policy that lets the admin email read pending/rejected rows from other users. So admin's `select * from startups` silently filters them out.

The same applies to `UPDATE` — the admin currently can't approve/reject other users' applications either (the existing trigger that allows status changes by the admin email never runs because the `UPDATE` is blocked by RLS first).

## Fix

One migration that adds two admin-scoped RLS policies on `public.startups`, scoped to the admin email via `auth.jwt()->>'email'`:

1. `SELECT` policy — admin can read every row (any status, any user).
2. `UPDATE` policy — admin can update every row (so approve/reject works for other users' applications). The existing `prevent_user_status_change` trigger continues to guard non-admins.

No code changes to `src/routes/admin.tsx` are needed; once RLS lets the admin read/update all rows, the existing UI works (the pending tab will show PreShip Validation, approve/reject will succeed).

### Migration sketch

```sql
CREATE POLICY "Admin can read all startups"
ON public.startups FOR SELECT TO authenticated
USING (COALESCE(auth.jwt()->>'email','') = 'danielabinav16@gmail.com');

CREATE POLICY "Admin can update all startups"
ON public.startups FOR UPDATE TO authenticated
USING (COALESCE(auth.jwt()->>'email','') = 'danielabinav16@gmail.com')
WITH CHECK (COALESCE(auth.jwt()->>'email','') = 'danielabinav16@gmail.com');
```

## Result

After the migration, refreshing `/admin` will show `All: 3`, `Pending: 1` with PreShip Validation visible, and approve/reject will work for it.
