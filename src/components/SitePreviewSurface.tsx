import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { resolveEmbedUrl } from "@/lib/preview-probe.functions";

/** Renders the visitor's own site inside a browser mock. A server probe picks
 *  the variant that can actually be framed (apex vs www, following redirects);
 *  if none can, we show a live screenshot instead, and finally a site card. */
function shotUrl(url: string) {
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1280&h=800`;
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
    <div className={`sb-loader flex ${heightCls} w-full flex-col items-center justify-center gap-5 overflow-hidden`}>
      <div className="sb-loader-glow" aria-hidden />
      <div className="relative flex items-center gap-3">
        <div className="sb-loader-track">
          <div className="sb-loader-pill" />
        </div>
        <span className="text-[26px] font-semibold tracking-tight text-header-ink">StartupBar</span>
      </div>
      <div className="relative flex items-center gap-2 text-xs text-header-ink/50">
        <span>Loading {host}</span>
        <span className="sb-loader-dots" aria-hidden><i /><i /><i /></span>
      </div>
    </div>
  );
}

export function SitePreviewSurface({ url, heightCls = "h-[320px] sm:h-[420px]" }: { url: string; heightCls?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [shotFailed, setShotFailed] = useState(false);
  const [shotTry, setShotTry] = useState(0);
  const [shotReady, setShotReady] = useState(false);
  const shot = `${shotUrl(url)}&t=${shotTry}`;

  const probe = useQuery({
    queryKey: ["embed-probe", url],
    queryFn: () => resolveEmbedUrl({ data: { url } }),
    staleTime: 10 * 60 * 1000,
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
    if (img.naturalWidth >= 600) return setShotReady(true);
    if (img.naturalWidth < 600 && shotTry < 4) {
      window.setTimeout(() => setShotTry((n) => n + 1), 2500);
    } else if (img.naturalWidth < 600) {
      setShotFailed(true);
    }
  };

  if (blocked) {
    if (shotFailed) return <SiteCard url={url} heightCls={heightCls} />;
    return (
      <div className={`relative ${heightCls} w-full`}>
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
    <div className={`relative ${heightCls} w-full bg-white`}>
      {!loaded && <SiteCard url={url} heightCls={`absolute inset-0 ${heightCls}`} />}
      {frameUrl && (
        <iframe
          src={frameUrl}
          title="Your site preview"
          className={`relative h-full w-full transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setBlocked(true)}
        />
      )}
    </div>
  );
}
