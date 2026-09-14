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
  const initial = (slot.founder_name || slot.name || "?").trim().charAt(0).toUpperCase();
  const visitUrl = slot.startup_id
    ? `/api/public/widget/click?id=${slot.startup_id}&source=featured`
    : slot.website_url;
  const handle = slot.twitter_handle ? cleanHandle(slot.twitter_handle) : null;
  return (
    <a
      href={visitUrl}
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
            {handle && (
              <span
                role="link"
                aria-label={`Founder on X: @${handle}`}
                title={`@${handle} on X`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(`https://x.com/${handle}`, "_blank", "noopener,noreferrer");
                }}
                className="grid h-4 w-4 shrink-0 cursor-pointer place-items-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/90"
              >
                <XIcon className="h-2.5 w-2.5" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* One-liner across the full card width */}
      <p className="line-clamp-3 min-h-0 min-w-0 overflow-hidden text-[11px] leading-[1.4] text-white/60">
        {slot.description}
      </p>

      {/* Bottom action row: primary CTA + quiet profile / social links */}
      <div className="mt-auto flex min-w-0 items-center gap-2.5 border-t border-white/10 pt-2">
        <span className="shrink-0 text-[11px] font-semibold text-[oklch(0.85_0.12_85)] transition-transform duration-300 group-hover:translate-x-0.5">
          Visit site →
        </span>
        <span className="flex-1" />
        {slot.slug && (
          <span
            role="link"
            aria-label={`View ${slot.name} profile`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(`/startup/${slot.slug}`, "_blank", "noopener,noreferrer");
            }}
            className="shrink-0 cursor-pointer text-[10px] text-white/45 transition-colors hover:text-white/90"
          >
            View profile
          </span>
        )}
        {handle && (
          <span
            role="link"
            aria-label={`Founder on X: @${handle}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(`https://x.com/${handle}`, "_blank", "noopener,noreferrer");
            }}
            className="flex shrink-0 cursor-pointer items-center gap-1 text-[10px] text-white/45 transition-colors hover:text-white/90"
          >
            <XIcon className="h-2.5 w-2.5" />
            <span className="max-w-[4.5rem] truncate">@{handle}</span>
          </span>
        )}
      </div>
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
