import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { StartupFavicon } from "@/components/StartupFavicon";
import { FeaturedBookingDialog } from "@/components/FeaturedBookingDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchFeaturedSlots, FEATURED_PRICE_USD, FEATURED_BILLING_LABEL, FEATURED_SLOT_COUNT } from "@/lib/featured";

/**
 * Compact featured rail for small screens (the side rails are xl-only).
 * Sticks under the header while scrolling and scrolls horizontally.
 */
export function FeaturedMobileBanner(_props: { slots?: number[] }) {
  const [open, setOpen] = useState(false);
  const { data: booked = [], refetch } = useQuery({
    queryKey: ["featured-slots"],
    queryFn: fetchFeaturedSlots,
    staleTime: 60_000,
  });

  if (booked.length === 0) return null;

  return (
    <div className="sticky top-16 z-20 -mx-4 -mt-6 mb-3 border-b border-black/[0.06] bg-[#f7f7f6] px-4 py-2 sm:-mx-6 sm:-mt-8 sm:px-6 xl:hidden">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger
            aria-label="About featured spots"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-black/10 text-black/45 transition-colors hover:border-black/30 hover:text-black"
          >
            <Info className="h-4 w-4" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 text-sm">
            <p className="font-semibold text-black">Featured spots</p>
            <p className="mt-1 text-black/60">
              A limited set of {FEATURED_SLOT_COUNT} paid spots shown across the network and
              leaderboard pages. Featured startups get permanent placement, a gold highlight and
              tracked clicks — ${FEATURED_PRICE_USD} {FEATURED_BILLING_LABEL}.
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 w-full rounded-lg bg-black px-3 py-2 text-xs font-medium text-white"
            >
              Book a spot
            </button>
          </PopoverContent>
        </Popover>

        <div className="flex snap-x gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {booked.map((s) => (
            <a
              key={s.slot_index}
              href={s.startup_id ? `/api/public/widget/click?id=${s.startup_id}&source=featured` : s.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="sb-sponsored relative flex shrink-0 snap-start items-center gap-2 overflow-hidden rounded-xl border px-3 py-1.5"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-lg bg-black/40">
                <StartupFavicon url={s.website_url} name={s.name} logoUrl={s.logo_url} size={18} />
              </span>
              <span className="max-w-[10rem] truncate text-sm font-medium text-white/95">{s.name}</span>
            </a>
          ))}
        </div>
      </div>

      <FeaturedBookingDialog open={open} onOpenChange={setOpen} onBooked={() => void refetch()} />
    </div>
  );
}
