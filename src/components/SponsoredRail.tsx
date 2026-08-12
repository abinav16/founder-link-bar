import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

/**
 * Static placeholder sponsored rail.
 * Desktop only (>= 2xl). Rendered on both sides: 5 slots each.
 */
export function SponsoredRail({ side = "right" }: { side?: "left" | "right" }) {
  const slots = [1, 2, 3, 4, 5];
  return (
    <aside
      className="hidden 2xl:block w-[280px] shrink-0"
      aria-label={`Sponsored (${side})`}
    >
      <div className="sticky top-20 flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/30">
            Sponsored
          </span>
          <span className="text-[10px] text-black/20">{slots.length} slots</span>
        </div>

        {slots.map((i) => (
          <div
            key={i}
            className="group rounded-2xl border border-dashed border-black/12 bg-white/60 p-3.5 transition-colors hover:border-black/25"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black/[0.04]">
                <Sparkles className="h-4 w-4 text-black/25" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-black/70">
                  Sponsor slot {i}
                </div>
                <div className="truncate text-xs text-black/35">Your startup here</div>
              </div>
            </div>
            <Link
              to="/pricing"
              className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-lg border border-black/12 bg-white text-xs font-medium text-black/60 transition-colors group-hover:border-black/25 group-hover:text-black"
            >
              Sponsor this slot
            </Link>
          </div>
        ))}

        <p className="px-1 text-[10px] leading-relaxed text-black/25">
          Sponsored slots are separate from the widget rotation and never affect leaderboard
          ranking.
        </p>
      </div>
    </aside>
  );
}
