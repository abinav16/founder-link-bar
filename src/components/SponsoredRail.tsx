import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StartupFavicon } from "@/components/StartupFavicon";
import { FeaturedBookingDialog } from "@/components/FeaturedBookingDialog";
import { fetchFeaturedSlots, railSlots, type FeaturedSlot } from "@/lib/featured";

/**
 * Sponsored rail. Desktop only. 4 slots per side (left = 1-4, right = 5-8).
 * Booked slots render the featured startup card; free ones invite a booking.
 */
function SlotMark() {
  return (
    <div className="relative">
      <div className="relative grid h-9 w-9 place-items-center rounded-full border border-black/15 bg-transparent">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="text-black/25 transition-colors duration-500 group-hover:text-black/45"
        >
          <path
            d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z"
            fill="currentColor"
            fillOpacity="0.8"
            stroke="currentColor"
            strokeWidth="0.5"
          />
          <circle cx="12" cy="12" r="2" fill="none" />
        </svg>
      </div>
    </div>
  );
}

function FeaturedCard({ slot }: { slot: FeaturedSlot }) {
  const initial = (slot.founder_name || slot.name || "?").trim().charAt(0).toUpperCase();
  return (
    <a
      href={slot.startup_id ? `/api/public/widget/click?id=${slot.startup_id}&source=featured` : slot.website_url}
      target="_blank"
      rel="noopener noreferrer"
      className="sb-sponsored group relative flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden rounded-2xl border p-3 transition-all duration-500"
    >
      {/* Top block: big logo on the left, name + founder stacked on the right */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-[oklch(0.75_0.13_75_/_0.25)] bg-black/40">
          <StartupFavicon
            url={slot.website_url}
            name={slot.name}
            logoUrl={slot.logo_url}
            size={22}
          />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight text-white/95">
              {slot.name}
            </span>
          </div>


          <div className="flex min-w-0 items-center gap-1.5">
            {slot.founder_avatar_url ? (
              <img
                src={slot.founder_avatar_url}
                alt={slot.founder_name ?? "Founder"}
                loading="lazy"
                className="h-4 w-4 shrink-0 rounded-full object-cover ring-1 ring-[oklch(0.75_0.13_75_/_0.35)]"
              />
            ) : (
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/10 text-[8px] font-semibold text-white/70">
                {initial}
              </span>
            )}
            <span className="min-w-0 truncate text-[10px] text-white/45">
              {slot.founder_name ?? "Founder"}
            </span>
          </div>
        </div>
      </div>

      {/* One-liner across the full card width */}
      <p className="line-clamp-3 min-h-0 min-w-0 overflow-hidden text-[11px] leading-[1.4] text-white/60">
        {slot.description}
      </p>


    </a>
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
      <div className="sticky top-20 grid auto-rows-[150px] gap-2.5">
        {railSlots(side).map((i) => {
          const taken = bookedBy.get(i);
          if (taken) return <FeaturedCard key={i} slot={taken} />;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSlot(i);
                setOpen(true);
              }}
              className="group relative flex h-full min-h-0 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-black/15 bg-transparent p-4 text-center transition-all duration-300 hover:border-black/35 hover:bg-black/[0.02]"
            >
              <SlotMark />

              <div className="relative z-10 space-y-0.5">
                <span className="block text-[9px] font-medium uppercase tracking-[0.3em] text-black/35 transition-colors duration-300 group-hover:text-black/55">
                  Available slot
                </span>
                <h3
                  className="text-[1.2rem] font-medium italic leading-tight text-black/55 transition-colors duration-300 group-hover:text-black/75"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  Book this slot
                </h3>
              </div>

            </button>
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
