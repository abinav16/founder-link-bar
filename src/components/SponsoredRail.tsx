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

function FeaturedCard({ slot }: { slot: FeaturedSlot }) {
  const initial = (slot.founder_name || slot.name || "?").trim().charAt(0).toUpperCase();
  return (
    <a
      href={slot.website_url}
      target="_blank"
      rel="noopener noreferrer"
      className="sb-sponsored group relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-2xl border p-4 transition-all duration-500"
    >
      {/* Top block: big logo on the left, name + founder stacked on the right */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-[oklch(0.75_0.13_75_/_0.25)] bg-black/40">
          <StartupFavicon
            url={slot.website_url}
            name={slot.name}
            logoUrl={slot.logo_url}
            size={30}
          />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-white/95">
              {slot.name}
            </span>
            <span className="shrink-0 rounded-full border border-[oklch(0.75_0.13_75_/_0.35)] bg-[oklch(0.75_0.13_75_/_0.12)] px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.14em] text-[oklch(0.82_0.12_75)]">
              Featured
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            {slot.founder_avatar_url ? (
              <img
                src={slot.founder_avatar_url}
                alt={slot.founder_name ?? "Founder"}
                loading="lazy"
                className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-[oklch(0.75_0.13_75_/_0.35)]"
              />
            ) : (
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-[9px] font-semibold text-white/70">
                {initial}
              </span>
            )}
            <span className="min-w-0 truncate text-[11px] text-white/45">
              {slot.founder_name ?? "Founder"}
            </span>
          </div>
        </div>
      </div>

      {/* One-liner across the full card width */}
      <p className="line-clamp-2 min-h-0 min-w-0 overflow-hidden text-[12.5px] leading-[1.45] text-white/60">
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
      <div className="sticky top-20 flex h-[calc(100dvh-6rem)] flex-col gap-3">
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
