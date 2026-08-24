import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { resolveEmbedUrl } from "@/lib/preview-probe.functions";

/** Renders the visitor's own site inside a browser mock. A server probe picks
 *  the variant that can actually be framed (apex vs www, following redirects);
 *  if none can, we show a live screenshot instead. */
export function SitePreviewSurface({ url, heightCls = "h-[320px] sm:h-[420px]" }: { url: string; heightCls?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [shotFailed, setShotFailed] = useState(false);
  const shot = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;

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
  }, [url]);

  // Probe says this site refuses framing → go straight to the screenshot.
  useEffect(() => {
    if (probe.isSuccess && !probe.data?.url) setBlocked(true);
  }, [probe.isSuccess, probe.data]);

  // Safety net for sites that pass the header check but still never render.
  useEffect(() => {
    if (!frameUrl || loaded || blocked) return;
    const t = window.setTimeout(() => setBlocked(true), 4000);
    return () => window.clearTimeout(t);
  }, [frameUrl, loaded, blocked]);

  if (blocked) {
    if (shotFailed) {
      return (
        <div className={`flex ${heightCls} items-center justify-center bg-black/[0.02] text-sm text-black/35`}>
          Preview not available for this site
        </div>
      );
    }
    return (
      <img
        src={shot}
        alt="Your site preview"
        onError={() => setShotFailed(true)}
        className={`${heightCls} w-full bg-black/[0.02] object-cover object-top`}
      />
    );
  }

  return (
    <div className={`relative ${heightCls} w-full bg-white`}>
      {/* Screenshot loads in parallel so something real appears almost instantly. */}
      {!loaded && !shotFailed && (
        <img
          src={shot}
          alt=""
          aria-hidden
          onError={() => setShotFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      )}
      {!loaded && shotFailed && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-black/[0.04] to-black/[0.01]" />
      )}
      {frameUrl && (
        <iframe
          src={frameUrl}
          title="Your site preview"
          className={`h-full w-full transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setBlocked(true)}
        />
      )}
    </div>
  );
}
