import { useEffect, useRef, useState } from "react";
import { RefreshCw, ExternalLink, MousePointerClick } from "lucide-react";

export function StartupEmbed({ url, name, initialBlocked }: { url: string; name: string; initialBlocked?: boolean | null }) {
  const [interactive, setInteractive] = useState(false);
  const [blocked, setBlocked] = useState<boolean>(!!initialBlocked);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const normalized = url.startsWith("http") ? url : `https://${url}`;

  useEffect(() => {
    if (blocked) return;
    const t = window.setTimeout(() => {
      try {
        const doc = iframeRef.current?.contentDocument;
        // If we can access an empty doc, likely blocked
        if (doc && doc.body && doc.body.childNodes.length === 0) setBlocked(true);
      } catch {
        // Cross-origin access denied means it actually loaded — leave alone
      }
    }, 4000);
    return () => window.clearTimeout(t);
  }, [reloadKey, blocked]);

  if (blocked) {
    const shot = `https://api.microlink.io/?url=${encodeURIComponent(normalized)}&screenshot=true&meta=false&embed=screenshot.url`;
    return (
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-black/5">
        <img src={shot} alt={`${name} screenshot`} className="w-full h-[500px] object-cover object-top" />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-black/10 bg-white/95 px-4 py-2.5 backdrop-blur">
          <span className="text-xs text-black/50">Preview only — this site blocks embedding.</span>
          <a href={normalized} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-black/80">
            Open site <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-black/6 bg-black/[0.02] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-2 truncate text-[11px] text-black/40">{normalized}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setReloadKey((k) => k + 1)}
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
