import { useEffect, useRef, useState } from "react";
import { RefreshCw, ExternalLink, MousePointerClick, ImageOff } from "lucide-react";

export function StartupEmbed({ url, name, initialBlocked }: { url: string; name: string; initialBlocked?: boolean | null }) {
  const [interactive, setInteractive] = useState(false);
  const [blocked, setBlocked] = useState<boolean>(!!initialBlocked);
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [shotFailed, setShotFailed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  let host = url;
  try { host = new URL(normalized).hostname.replace(/^www\./, ""); } catch {}

  useEffect(() => {
    if (blocked) return;
    setLoaded(false);
    // If iframe hasn't fired `load` within 3.5s, assume it's being blocked
    // (X-Frame-Options / frame-ancestors show the browser's own error page,
    // which never triggers onError and blocks cross-origin doc inspection).
    const t = window.setTimeout(() => {
      if (!loaded) setBlocked(true);
    }, 3500);
    return () => window.clearTimeout(t);
  }, [reloadKey, blocked, loaded]);

  if (blocked) {
    const shot = `https://api.microlink.io/?url=${encodeURIComponent(normalized)}&screenshot=true&meta=false&embed=screenshot.url`;
    return (
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-br from-black/[0.03] to-black/[0.01]">
        <div className="relative h-[500px] w-full">
          {shotFailed ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-black/40">
              <ImageOff className="h-8 w-8" />
              <p className="text-sm">Preview not available</p>
            </div>
          ) : (
            <img
              src={shot}
              alt={`${name} screenshot`}
              className="h-full w-full object-cover object-top"
              onError={() => setShotFailed(true)}
              loading="lazy"
            />
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent px-4 py-3">
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-black/60 backdrop-blur">
              Live snapshot
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-black/10 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-black">{host}</p>
            <p className="truncate text-xs text-black/45">This site can't be embedded — open it in a new tab.</p>
          </div>
          <a href={normalized} target="_blank" rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-xs font-medium text-white hover:bg-black/85">
            Open {host} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-black/6 bg-black/[0.02] px-3 py-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-2 truncate text-[11px] text-black/40">{normalized}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setLoaded(false); setReloadKey((k) => k + 1); }}
            className="rounded-md p-1.5 text-black/40 hover:bg-black/5 hover:text-black">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <a href={normalized} target="_blank" rel="noopener noreferrer"
            className="rounded-md p-1.5 text-black/40 hover:bg-black/5 hover:text-black">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      <div className="relative">
        <iframe
          key={reloadKey}
          ref={iframeRef}
          src={normalized}
          title={`${name} live preview`}
          className={interactive ? "h-[720px] w-full" : "h-[500px] w-full"}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setBlocked(true)}
        />
        {!interactive && (
          <button
            onClick={() => setInteractive(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/[0.02]"
            aria-label="Click to interact"
          >
            <span className="pointer-events-none inline-flex items-center gap-2 rounded-full bg-black/85 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur">
              <MousePointerClick className="h-3.5 w-3.5" /> Click to interact
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
