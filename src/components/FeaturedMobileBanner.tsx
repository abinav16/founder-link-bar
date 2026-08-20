import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StartupFavicon } from "@/components/StartupFavicon";
import { FeaturedBookingDialog } from "@/components/FeaturedBookingDialog";
import { fetchFeaturedSlots } from "@/lib/featured";

/**
 * Compact promoted rail for small screens (the side rails are xl-only).
 * Shows just logo + startup name, scrolling horizontally.
 */
export function FeaturedMobileBanner({ slots }: { slots: number[] }) {
  const [open, setOpen] = useState(false);
  const { data: booked = [], refetch } = useQuery({
    queryKey: ["featured-slots"],
    queryFn: fetchFeaturedSlots,
    staleTime: 60_000,
  });

  const mine = booked.filter((b) => slots.includes(b.slot_index));
  const anyBooked = booked.length > 0;
  if (!anyBooked) return null;

  return (
    <div className="xl:hidden">
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.25em] text-black/35">
        Promoted
      </span>
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {mine.length > 0 ? (
          mine.map((s) => (
            <a
              key={s.slot_index}
              href={s.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="sb-sponsored relative flex shrink-0 snap-start items-center gap-2 overflow-hidden rounded-xl border px-3 py-2"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-black/40">
                <StartupFavicon url={s.website_url} name={s.name} logoUrl={s.logo_url} size={20} />
              </span>
              <span className="max-w-[10rem] truncate text-sm font-medium text-white/95">
                {s.name}
              </span>
            </a>
          ))
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex shrink-0 snap-start items-center gap-2 rounded-xl border border-black/15 px-3 py-2 text-sm text-black/50 transition-colors hover:border-black/35 hover:text-black/75"
          >
            Book this slot
          </button>
        )}
      </div>

      <FeaturedBookingDialog open={open} onOpenChange={setOpen} onBooked={() => void refetch()} />
    </div>
  );
}
