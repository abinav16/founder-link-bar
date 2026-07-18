## Track STARTUPBAR badge clicks

Right now the badge in the widget bar is a plain external link to `https://startupbar.co` — no click row is written. We'll route it through our click tracker so we can measure it, without attributing it to any startup.

### Changes

1. **`src/routes/widget.bar.tsx`** — Change the STARTUPBAR badge `<a>` from `href="https://startupbar.co"` to `href="/api/public/widget/click?source=badge${host ? &host=... : ""}${domain ? &via=... : ""}"` (target=_blank preserved). This mirrors how the "Visit →" arrow works.

2. **`src/routes/api/public/widget.click.ts`** — Handle `source=badge`:
   - When `source === "badge"`, skip the startup lookup, insert a click row with `shown_startup_id = <StartupBar site id>` and `host_startup_id = host ?? null`, then 302 to `https://startupbar.co/` with `utm_source=startupbar`, `utm_medium=badge`, `utm_campaign=network`, and `_sbvia=<host domain>` so the landing on startupbar.co is also correctly attributed on the homepage globe (same mechanism we just shipped).
   - Preserve existing behavior for all other `source` values.

### Result

- Badge clicks show up in the `clicks` table (attributed to the StartupBar site startup, with `host_startup_id` set to the site that referred them).
- They appear in "widget clicks" totals because `host_startup_id` is non-null.
- The visitor's landing on startupbar.co gets categorized as StartupBar (not Direct) on the homepage globe.

No schema changes needed.
