# Widget distribution algorithm + paid boosting design

## How distribution works today

1. **Eligibility gate** — Only approved, non-banned member sites can host network picks. Non-members see StartupBar's own listing (no impression counted). StartupBar's own pages are treated as `host = null` and allowed.
2. **Candidate pool** — The pick is made from every `approved` startup, excluding the host itself and any startup whose website matches the current page domain.
3. **Reciprocity weighting** — A 7-day rolling score is calculated per startup:
   - `given` = impressions the startup's site has supplied to the network (host_startup_id = that startup) in the last 7 days, excluding `dev-simulate`.
   - `avg` = average `given` across all approved startups.
   - Each startup's weight = `clamp(1.0, 1.0 + (given / avg), 4.0)`.
   - So every startup gets at least `1x` (floor for new/small sites), and the biggest traffic contributors cap at `4x`.
4. **Weighted random pick** — A cumulative random draw picks one startup from the candidate pool using those weights. The weight itself does not guarantee placement; it raises the probability.
5. **Session deduplication** — One impression is recorded per browser session per shown startup. Repeats in the same session still show the bar but don't inflate the count.
6. **Rotation** — The bar auto-rotates every 30 seconds with a smooth fade; each rotation is a new pick request.

## Where the boosting option fits

Paid boosting will be a **multiplier on top of the reciprocity weight** for a fixed time window. It does not replace the reciprocity engine; it stacks on it so paid founders can temporarily rise above the normal 4x cap.

## Proposed changes

### Schema
- Add `public.boosts` table:
  - `startup_id uuid references startups(id) on delete cascade`
  - `multiplier double precision not null` (e.g., 2.0, 3.0, 5.0)
  - `active_from timestamptz not null default now()`
  - `active_until timestamptz not null`
  - `created_at timestamptz not null default now()`
- Add `GRANT` block and RLS policy so only the startup owner and admin can manage boosts.

### Weight function
- Update `widget_pick_weights()` to join active boosts and return `effective_weight = reciprocity_weight * COALESCE(active_multiplier, 1.0)`.
- Keep the same 1x floor and 4x cap for the **reciprocity base**, then apply the boost multiplier after the cap, so a boosted startup can exceed 4x.
- Cap the final effective weight at a hard ceiling (suggested 20x) to prevent one paid listing from dominating every slot.

### Pick endpoint
- `src/routes/api/public/widget.pick.ts` needs no logic change; it already calls `widget_pick_weights()` and `weightedPick()`. The new weights flow through automatically.

### Admin UI
- Add a "Boosts" section in `src/routes/admin.tsx` to:
  - Create a boost for a startup (multiplier + duration).
  - List active/past boosts.
- Show an active "BOOSTED" badge on the startup row in admin.

### Pricing / Checkout
- Add a paid boost SKU in `create-dodo-checkout` and a webhook handler for it.
- Or, if this is manual/admin-only for now, skip checkout and add a form in admin with no payment gate.

## Open product question

The user must decide:
- Is the first version manual/admin-only (you create boosts by hand for founders who paid elsewhere), or should founders self-serve purchase through Dodo?
- What multiplier range and duration? Suggested starting point: **2x-5x for 24 hours or 7 days**, capped at 20x final weight.
- Should boosted impressions still count toward reciprocity? Suggested: yes, they are still real traffic, so the host gets normal credit.
