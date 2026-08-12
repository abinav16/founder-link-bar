import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

/**
 * Static placeholder sponsored rail.
 * Desktop only (>= 2xl). Rendered on both sides: 5 slots each.
 * Each slot previews how a sponsored listing appears:
 * logo, startup name, founder name, one liner.
 */
export function SponsoredRail({ side = "right" }: { side?: "left" | "right" }) {
  const slots = [1, 2, 3, 4];
  return (
    <aside className="hidden 2xl:block w-[280px] shrink-0" aria-label={`Sponsored (${side})`}>
      <div className="sticky top-20 flex h-[calc(100dvh-6rem)] flex-col gap-3">
        {slots.map((i) => (
          <Link
            key={i}
            to="/pricing"
            className="group relative flex min-h-0 flex-1 flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-black/8 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)]"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-dashed border-black/15 bg-black/[0.03] text-black/25 transition-colors group-hover:border-black/30 group-hover:text-black/45">
                <Plus className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-semibold text-black/75">
                    Your startup
                  </span>
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-black/25">
                    Ad
                  </span>
                </div>
                <div className="mt-1 truncate text-[11px] text-black/40">by your name</div>
              </div>
            </div>
            <p className="text-[13px] leading-relaxed text-black/50">
              One line about what you build, shown to founders browsing the network.
            </p>
            <span className="inline-block text-[11px] font-medium text-black/35 transition-colors group-hover:text-black">
              Sponsor this slot
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
