## Fix Network Activity panel height & redesign

The right panel currently stretches taller than the podium because `items-stretch` lets it expand to its content. Goal: cap it at the podium's natural height and tighten the layout.

### Changes to `src/routes/leaderboard.tsx` (right panel only)

1. **Outer grid**: keep `items-stretch` so columns share height — but the podium drives height (since the right panel will become more compact).

2. **Redesign the Network Activity card** into a tighter 2×2 stat matrix instead of stacked Yesterday / Today sections:

   ```
   ┌─────────────────────────────┐
   │ NETWORK ACTIVITY            │
   ├──────────────┬──────────────┤
   │ YESTERDAY    │ YESTERDAY    │
   │ 38           │ 1            │
   │ impressions  │ clicks       │
   ├──────────────┼──────────────┤
   │ ● TODAY      │ ● TODAY      │
   │ 44           │ 1            │
   │ impressions  │ clicks       │
   │   (black bg) │   (black bg) │
   ├──────────────┴──────────────┤
   │ Resets at midnight UTC      │
   └─────────────────────────────┘
   ```

   - Inner card: `p-4 h-full flex flex-col gap-3` (replace current `p-5 justify-between`)
   - Replace the two big stacked stat-pair blocks with a single `grid grid-cols-2 gap-2` containing 4 compact stat tiles
   - Each tile: `rounded-lg p-2.5`, label `text-[9px] uppercase tracking-wider`, number `text-xl font-bold`, sub-label `text-[10px]`
   - Today tiles: black bg + white text + tiny pulsing dot on the label
   - Yesterday tiles: `bg-black/[0.03]` + black text
   - Footer caption stays at bottom: `text-[10px] text-black/40`

3. **Result**: panel height drops to ~podium height (~280–300px) instead of overflowing, while still showing all 4 metrics + the reset note.

No other sections (header, tabs, ranked list, podium) change.
