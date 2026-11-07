import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { pickBanners, type PublicBanner } from "@/lib/banner-ads.functions";

const seen = new Set<string>();

function send(id: string, kind: "view" | "click") {
  try {
    fetch("/api/public/ad/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, kind }), keepalive: true });
  } catch { /* ignore */ }
}

/** Pure presentation, also used by the setup preview. */
export function BannerCreative({ b, onClick, preview }: { b: Pick<PublicBanner, "advertiser_name" | "headline" | "destination_url" | "desktop_image_url" | "mobile_image_url">; onClick?: () => void; preview?: "desktop" | "mobile" }) {
  const img = (src: string, cls: string) => src
    ? <img src={src} alt={b.headline || `${b.advertiser_name} — sponsored`} className={`block w-full ${cls}`} loading="lazy" />
    : <div className={`grid w-full place-items-center bg-muted text-xs text-muted-foreground ${cls}`}>Your banner</div>;
  return (
    <a
      href={b.destination_url || "#"}
      target="_blank"
      rel="noopener sponsored"
      onClick={onClick}
      className="banner-ad group relative block overflow-hidden rounded-xl border border-border bg-card"
    >
      {preview === "mobile" ? img(b.mobile_image_url, "aspect-[2/1] object-cover")
        : preview === "desktop" ? img(b.desktop_image_url, "aspect-[6/1] object-cover")
        : (<>
          <span className="sm:hidden">{img(b.mobile_image_url, "aspect-[2/1] object-cover")}</span>
          <span className="hidden sm:block">{img(b.desktop_image_url, "aspect-[6/1] object-cover")}</span>
        </>)}
      <span className="absolute right-2 top-2 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">Ad</span>
    </a>
  );
}

export function BannerSlot({ slot = 0, className = "" }: { slot?: number; className?: string }) {
  const { data = [] } = useQuery({ queryKey: ["banners"], queryFn: () => pickBanners(), staleTime: 5 * 60_000 });
  const b = data.length ? data[slot % data.length] : null;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!b || !ref.current) return;
    const key = `${b.id}:${slot}`;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting) && !seen.has(key)) { seen.add(key); send(b.id, "view"); io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [b, slot]);
  if (!b || (slot >= data.length && data.length < 2)) return null;
  return <div ref={ref} className={className}><BannerCreative b={b} onClick={() => send(b.id, "click")} /></div>;
}
