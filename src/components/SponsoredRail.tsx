import { Link } from "@tanstack/react-router";

/**
 * Static placeholder sponsored rail.
 * Desktop only. Rendered on both sides: 4 slots each.
 * Unbooked slots show a "Book this slot" invite; once a startup
 * advertises, the slot renders the full featured card treatment.
 */
function SlotMark() {
  return (
    <div className="relative">
      <div className="absolute inset-0 scale-0 rounded-full bg-[oklch(0.75_0.13_75_/_0.2)] blur-xl transition-transform duration-700 group-hover:scale-150" />
      <div className="relative grid h-14 w-14 place-items-center rounded-full border border-[oklch(0.75_0.13_75_/_0.3)] bg-[oklch(0.17_0.008_260)] shadow-inner">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="text-[oklch(0.78_0.12_75)] transition-transform duration-500 group-hover:scale-110"
        >
          <path
            d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z"
            fill="currentColor"
            fillOpacity="0.8"
            stroke="currentColor"
            strokeWidth="0.5"
          />
          <circle cx="12" cy="12" r="2" fill="oklch(0.13 0.005 260)" />
        </svg>
      </div>
    </div>
  );
}

export function SponsoredRail({ side = "right" }: { side?: "left" | "right" }) {
  const slots = [1, 2, 3, 4];
  return (
    <aside className="hidden xl:block w-full min-w-0 shrink-0" aria-label={`Sponsored (${side})`}>
      <div className="sticky top-20 flex h-[calc(100dvh-6rem)] flex-col gap-3">
        {slots.map((i) => (
          <Link
            key={i}
            to="/pricing"
            className="sb-sponsored group relative flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl border p-6 text-center transition-all duration-500"
          >
            <SlotMark />

            <div className="relative z-10 space-y-1">
              <span className="block text-[10px] font-medium uppercase tracking-[0.4em] text-[oklch(0.78_0.12_75_/_0.6)] transition-colors duration-500 group-hover:text-[oklch(0.82_0.12_75)]">
                Available slot
              </span>
              <h3
                className="text-[1.6rem] font-medium italic leading-tight text-white/90 transition-colors duration-500 group-hover:text-white"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Book this slot
              </h3>
            </div>

            <span
              aria-hidden
              className="absolute bottom-5 h-px w-8 bg-[oklch(0.78_0.12_75_/_0.35)] transition-all duration-700 group-hover:w-16"
            />
          </Link>
        ))}
      </div>
    </aside>
  );
}
