import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

/**
 * Static placeholder sponsored rail.
 * Desktop only (>= 2xl). Rendered on both sides: 4 slots each.
 * Unbooked slots show a simple "Book this slot" invite; once a startup
 * advertises, the slot renders the full featured card treatment.
 */
export function SponsoredRail({ side = "right" }: { side?: "left" | "right" }) {
  const slots = [1, 2, 3, 4];
  return (
    <aside className="hidden xl:block w-full shrink-0" aria-label={`Sponsored (${side})`}>
      <div className="sticky top-20 flex h-[calc(100dvh-6rem)] flex-col gap-3">
        {slots.map((i) => (
          <Link
            key={i}
            to="/pricing"
            className="sb-sponsored group relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_oklch(0.65_0.15_68_/_0.4)]"
          >
            <div className="relative z-10 grid h-11 w-11 place-items-center rounded-xl border border-dashed border-[oklch(0.75_0.13_75_/_0.45)] bg-[oklch(0.75_0.13_75_/_0.1)] text-[oklch(0.8_0.13_75_/_0.85)] transition-colors group-hover:border-[oklch(0.75_0.13_75_/_0.75)] group-hover:text-[oklch(0.85_0.13_75)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="relative z-10 text-sm font-semibold tracking-tight text-[oklch(0.96_0.02_85)]">
              Book this slot
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
