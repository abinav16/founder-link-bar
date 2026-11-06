import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { resolveEmbedUrl } from "@/lib/preview-probe.functions";

/** Renders the visitor's own site inside a browser mock. A server probe picks
 *  the variant that can actually be framed (apex vs www, following redirects);
 *  if none can, we show a live screenshot instead, and finally a site card. */
function shotUrl(url: string, width = 1280, height = 800) {
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=${width}&h=${height}`;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SiteCard({ url, heightCls }: { url: string; heightCls: string }) {
  const host = hostOf(url);
  return (
    <div className={`@container sb-loader flex ${heightCls} w-full flex-col items-center justify-center gap-3 overflow-hidden px-4 @[320px]:gap-5`} role="status">
      <div className="sb-loader-glow" aria-hidden />
      <div className="relative flex min-w-0 max-w-full flex-col items-center gap-2 @[320px]:flex-row @[320px]:gap-3">
        <div className="sb-loader-track shrink-0">
          <div className="sb-loader-pill" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-header-ink @[320px]:text-[26px]">StartupBar</span>
      </div>
      <div className="relative flex min-w-0 max-w-full flex-col items-center gap-1.5 text-center text-[11px] text-header-ink/50 @[320px]:flex-row @[320px]:gap-2 @[320px]:text-xs">
        <span className="min-w-0 max-w-full truncate">Loading {host}</span>
        <span className="sb-loader-dots shrink-0" aria-hidden><i /><i /><i /></span>
      </div>
    </div>
  );
}

export function SitePreviewSurface({ url, heightCls = "h-[320px] sm:h-[420px]", viewportWidth }: { url: string; heightCls?: string; viewportWidth?: number }) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [surfaceSize, setSurfaceSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || !viewportWidth) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSurfaceSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(surface);
    return () => observer.disconnect();
  }, [viewportWidth]);
  const scale = viewportWidth && surfaceSize.width ? surfaceSize.width / viewportWidth : 1;
  const viewportHeight = viewportWidth && surfaceSize.height ? Math.ceil(surfaceSize.height / scale) : 800;
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [shotFailed, setShotFailed] = useState(false);
  const [shotTry, setShotTry] = useState(0);
  const [shotReady, setShotReady] = useState(false);
  const shot = `${shotUrl(url, viewportWidth, viewportWidth ? viewportHeight : 800)}&t=${shotTry}`;

  const probe = useQuery({
    queryKey: ["embed-probe-colors-v2", url],
    queryFn: () => resolveEmbedUrl({ data: { url } }),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const frameUrl = probe.data?.url ?? null;

  useEffect(() => {
    setLoaded(false);
    setBlocked(false);
    setShotFailed(false);
    setShotTry(0);
    setShotReady(false);
  }, [url]);

  useEffect(() => {
    if (probe.isSuccess && !probe.data?.url) setBlocked(true);
  }, [probe.isSuccess, probe.data]);

  useEffect(() => {
    if (!frameUrl || loaded || blocked) return;
    const t = window.setTimeout(() => setBlocked(true), 4000);
    return () => window.clearTimeout(t);
  }, [frameUrl, loaded, blocked]);

  // mShots returns a tiny "generating" placeholder first; retry a few times.
  const onShotLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const readyWidth = Math.min(viewportWidth ?? 600, 600);
    if (img.naturalWidth >= readyWidth) return setShotReady(true);
    if (img.naturalWidth < readyWidth && shotTry < 4) {
      window.setTimeout(() => setShotTry((n) => n + 1), 2500);
    } else if (img.naturalWidth < readyWidth) {
      setShotFailed(true);
    }
  };

  if (blocked) {
    if (shotFailed) return <SiteCard url={url} heightCls={heightCls} />;
    return (
      <div ref={surfaceRef} className={`relative ${heightCls} w-full overflow-hidden`}>
        <SiteCard url={url} heightCls={`absolute inset-0 ${heightCls}`} />
        <img
          src={shot}
          alt="Your site preview"
          onLoad={onShotLoad}
          onError={() => setShotFailed(true)}
          className={`relative ${heightCls} w-full object-cover object-top transition-opacity duration-300 ${shotReady ? "opacity-100" : "opacity-0"}`}
          style={{ background: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div ref={surfaceRef} className={`relative ${heightCls} w-full overflow-hidden bg-background`}>
      {!loaded && <SiteCard url={url} heightCls={`absolute inset-0 ${heightCls}`} />}
      {frameUrl && (
        <iframe
          src={frameUrl}
          title="Your site preview"
          className={`relative h-full w-full transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
          style={viewportWidth ? { width: viewportWidth, height: viewportHeight, transform: `scale(${scale})`, transformOrigin: "top left", border: 0 } : undefined}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setBlocked(true)}
        />
      )}
    </div>
  );
}
