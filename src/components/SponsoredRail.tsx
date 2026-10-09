import { useState } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { StartupFavicon } from "@/components/StartupFavicon";
import { FeaturedBookingDialog } from "@/components/FeaturedBookingDialog";
import { fetchFeaturedSlots, railSlots, type FeaturedSlot } from "@/lib/featured";

/**
 * Sponsored rail. Desktop only. 4 slots per side (left = 1-4, right = 5-8).
 * Booked slots render the featured startup card; free ones invite a booking.
 */
/** Minimal X (Twitter) brand mark — lucide has no brand X icon. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function cleanHandle(handle: string): string {
  return handle.replace(/^@/, "").trim();
}

function FeaturedCard({ slot }: { slot: FeaturedSlot }) {
  const visitUrl = slot.startup_id
    ? `/api/public/widget/click?id=${slot.startup_id}&source=featured`
    : slot.website_url;
  const handle = slot.twitter_handle ? cleanHandle(slot.twitter_handle) : null;
  return (
    <article className="featured-glass group relative flex h-full min-w-0 flex-col overflow-hidden rounded-lg border p-3 text-featured-text">
      <div className="mb-2.5 flex items-center justify-between text-[9px] font-medium text-featured-gold">
        <span>Featured</span>
        <span className="font-mono text-featured-muted/60">0{slot.slot_index}</span>
      </div>
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5">
        <a href={visitUrl} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${slot.name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-featured-gold/20 bg-featured-surface outline-none focus-visible:ring-2 focus-visible:ring-featured-gold">
          <StartupFavicon url={slot.website_url} name={slot.name} logoUrl={slot.logo_url} size={26} />
        </a>
        <div className="min-w-0">
          <a href={visitUrl} target="_blank" rel="noopener noreferrer" title={slot.name} className="block truncate text-[14px] font-semibold leading-tight transition-colors hover:text-featured-gold">{slot.name}</a>
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            {slot.founder_avatar_url && <img src={slot.founder_avatar_url} alt="" loading="lazy" className="h-3.5 w-3.5 shrink-0 rounded-full object-cover" />}
            <span className="truncate text-[10px] text-featured-muted">{slot.founder_name || "Founder"}</span>
            {handle && <a href={`https://x.com/${handle}`} target="_blank" rel="noopener noreferrer" aria-label={`Founder on X: @${handle}`} title={`@${handle} on X`} className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-featured-muted transition-colors hover:bg-featured-text/10 hover:text-featured-text"><XIcon className="h-2.5 w-2.5" /></a>}
          </div>
        </div>
      </div>
      <p className="mt-2.5 line-clamp-3 text-[11px] leading-[1.5] text-featured-muted">{slot.description}</p>
      <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-featured-text/10 pt-2">
        <a href={visitUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-1 text-[11px] font-semibold text-featured-gold">
          Visit site <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" />
        </a>
        {slot.slug && <a href={`/startup/${slot.slug}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-featured-muted transition-colors hover:text-featured-text">View profile</a>}
      </div>
    </article>
  );
}


export function SponsoredRail({ side = "right" }: { side?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<number | undefined>(undefined);
  const { data: booked = [], refetch } = useQuery({
    queryKey: ["featured-slots"],
    queryFn: fetchFeaturedSlots,
    staleTime: 60_000,
  });
  const bookedBy = new Map(booked.map((b) => [b.slot_index, b]));

  return (
    <aside className="hidden xl:block w-full min-w-0 shrink-0" aria-label={`Sponsored (${side})`}>
      <div className="sticky top-20 grid auto-rows-[180px] gap-3">
        {railSlots(side).map((i) => {
          const taken = bookedBy.get(i);
          if (taken) return <FeaturedCard key={i} slot={taken} />;
          return (
            <Button
              variant="outline"
              key={i}
              type="button"
              onClick={() => {
                setSlot(i);
                setOpen(true);
              }}
              className="group relative flex h-full min-h-0 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border-border bg-transparent p-4 text-center text-muted-foreground shadow-none transition-colors hover:border-foreground/25 hover:bg-card hover:text-foreground"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full border border-border transition-transform duration-300 motion-safe:group-hover:rotate-90"><Plus className="h-4 w-4" /></span>
              <span className="text-xs font-medium">Your startup here</span>
              <span className="text-[10px] font-normal text-muted-foreground">Book spot {i} <span aria-hidden>↗</span></span>
            </Button>
          );
        })}
      </div>

      <FeaturedBookingDialog
        open={open}
        onOpenChange={setOpen}
        initialSlot={slot}
        onBooked={() => void refetch()}
      />
    </aside>
  );
}
