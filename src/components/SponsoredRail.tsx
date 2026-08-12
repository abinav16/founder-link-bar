import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

/**
 * Static placeholder sponsored rail.
 * Desktop only (>= 2xl). Rendered on both sides: 4 slots each.
 * Each slot previews how a sponsored listing appears with the gold
 * premium treatment + animated sheen sweep: logo, startup name,
 * founder name, one liner.
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
            className="sb-sponsored group relative flex min-h-0 flex-1 flex-col justify-between gap-3 overflow-hidden rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_oklch(0.72_0.11_80_/_0.4)]"
          >
            <div className="relative z-10 flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-dashed border-[oklch(0.72_0.11_80_/_0.35)] bg-[oklch(0.72_0.11_80_/_0.06)] text-[oklch(0.72_0.11_80_/_0.5)] transition-colors group-hover:border-[oklch(0.72_0.11_80_/_0.6)] group-hover:text-[oklch(0.72_0.11_80_/_0.8)]">
                <Plus className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-semibold text-[oklch(0.45_0.06_75)]">
                    Your startup
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[oklch(0.6_0.09_75)]">
                    Featured
                  </span>
                </div>
                <div className="mt-1 truncate text-[11px] text-[oklch(0.45_0.06_75_/_0.65)]">by your name</div>
              </div>
            </div>
            <p className="relative z-10 text-[13px] leading-relaxed text-[oklch(0.4_0.05_75_/_0.7)]">
              One line about what you build, shown to founders browsing the network.
            </p>
          </Link>
        ))}
      </div>
    </aside>
  );
}
