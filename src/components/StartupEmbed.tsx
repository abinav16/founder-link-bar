import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ExternalLink, MousePointerClick, ImageOff } from "lucide-react";
import { getStartupEmbedStatus } from "@/lib/startup-page.functions";

export function StartupEmbed({ startupId, url, name, initialBlocked }: { startupId: string; url: string; name: string; initialBlocked?: boolean | null }) {
  const [interactive, setInteractive] = useState(false);
  const [blocked, setBlocked] = useState<boolean | null>(initialBlocked ?? null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [shotFailed, setShotFailed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  let host = url;
  try { host = new URL(normalized).hostname.replace(/^www\./, ""); } catch {}

  const embedStatusQ = useQuery({
    queryKey: ["startup-embed-status", startupId],
    queryFn: () => getStartupEmbedStatus({ data: { id: startupId } }),
    enabled: blocked === null,
    staleTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (typeof embedStatusQ.data === "boolean") setBlocked(embedStatusQ.data);
  }, [embedStatusQ.data]);

  useEffect(() => {
    if (blocked !== false) return;
    if (loaded) return;
    // Trust the server-side probe. If it said "not blocked" (or is still
    // fetching but the iframe is rendering optimistically), don't second-guess
    // with a client-side timeout — that was flipping to snapshot mid-load.
    if (initialBlocked === false || embedStatusQ.data === false) return;
    const t = window.setTimeout(() => {
      if (!loaded) setBlocked(true);
    }, 8000);
    return () => window.clearTimeout(t);
  }, [reloadKey, blocked, loaded, embedStatusQ.data, initialBlocked]);

  if (blocked === null) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-black/6 bg-black/[0.02] px-3 py-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
            <span className="ml-2 h-3 w-44 max-w-[45vw] rounded-full bg-black/[0.06]" />
          </div>
          <div className="h-7 w-16 rounded-md bg-black/[0.04]" />
        </div>
        <div className="relative h-[500px] animate-pulse bg-gradient-to-br from-black/[0.035] via-black/[0.015] to-black/[0.05]">
          <div className="absolute left-6 top-6 h-4 w-40 rounded-full bg-white/70" />
          <div className="absolute left-6 top-14 h-3 w-64 rounded-full bg-white/55" />
          <div className="absolute inset-x-6 bottom-6 grid grid-cols-3 gap-3">
            <div className="h-20 rounded-xl bg-white/55" />
            <div className="h-20 rounded-xl bg-white/45" />
            <div className="h-20 rounded-xl bg-white/35" />
          </div>
        </div>
      </div>
    );
  }

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
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-black/10 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <span className="mb-1 inline-flex rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black/60">
              Live snapshot
            </span>
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
