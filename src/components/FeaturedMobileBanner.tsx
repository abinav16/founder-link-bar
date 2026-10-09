import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StartupFavicon } from "@/components/StartupFavicon";
import { FeaturedBookingDialog } from "@/components/FeaturedBookingDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchFeaturedSlots, FEATURED_PRICE_USD, FEATURED_BILLING_LABEL, FEATURED_SLOT_COUNT } from "@/lib/featured";

/**
 * Tracks the bottom edge of the sticky site header. When the StartupBar widget
 * runs on our own site it pushes sticky headers down (header.style.top = 36px),
 * so a hardcoded sticky offset makes this strip slide behind the header.
 */
function useHeaderOffset() {
  const [offset, setOffset] = useState(64);
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const measure = () => {
      const cs = getComputedStyle(header);
      const top = parseFloat(cs.top);
      setOffset(Math.round((Number.isFinite(top) ? top : 0) + header.getBoundingClientRect().height));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    const mo = new MutationObserver(measure);
    mo.observe(header, { attributes: true, attributeFilter: ["style", "class"] });
    window.addEventListener("resize", measure);
    const t = window.setTimeout(measure, 1500);
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", measure);
      window.clearTimeout(t);
    };
  }, []);
  return offset;
}

/**
 * Compact featured rail for small screens (the side rails are xl-only).
 * Sticks under the header while scrolling and scrolls horizontally.
 */
export function FeaturedMobileBanner(_props: { slots?: number[] }) {
  const [open, setOpen] = useState(false);
  const headerOffset = useHeaderOffset();
  const { data: booked = [], refetch } = useQuery({
    queryKey: ["featured-slots"],
    queryFn: fetchFeaturedSlots,
    staleTime: 60_000,
  });

  if (booked.length === 0) return null;

  return (
    <div
      style={{ top: headerOffset }}
      className="sticky z-20 -mx-4 -mt-6 mb-3 border-b border-border bg-background/95 backdrop-blur-xl px-4 py-2 sm:-mx-6 sm:-mt-8 sm:px-6 xl:hidden"
    >

      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
        <Popover>
          <PopoverTrigger
            aria-label="About featured spots"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <Info className="h-4 w-4" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 text-sm">
            <p className="font-semibold text-foreground">Featured spots</p>
            <p className="mt-1 text-muted-foreground">
              A limited set of {FEATURED_SLOT_COUNT} paid spots shown across the network and
              leaderboard pages. Featured startups get permanent placement, a gold highlight and
              tracked clicks — ${FEATURED_PRICE_USD} {FEATURED_BILLING_LABEL}.
            </p>
            <Button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 w-full text-xs"
            >
              Book a spot
            </Button>
          </PopoverContent>
        </Popover>

        <div className="flex min-w-0 snap-x gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {booked.map((s) => (
            <a
              key={s.slot_index}
              href={s.startup_id ? `/api/public/widget/click?id=${s.startup_id}&source=featured` : s.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="featured-glass group relative flex h-11 shrink-0 snap-start items-center gap-2.5 overflow-hidden rounded-lg border px-3"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-md bg-featured-surface">
                <StartupFavicon url={s.website_url} name={s.name} logoUrl={s.logo_url} size={18} />
              </span>
              <span className="max-w-[10rem] truncate text-[13px] font-semibold text-featured-text">{s.name}</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-featured-gold transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" />
            </a>
          ))}
        </div>
      </div>

      <FeaturedBookingDialog open={open} onOpenChange={setOpen} onBooked={() => void refetch()} />
    </div>
  );
}
