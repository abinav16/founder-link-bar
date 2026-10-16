import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { z } from "zod";
import { StartupFavicon } from "@/components/StartupFavicon";

const search = z.object({
  host: z.string().uuid().optional(),
  theme: z.enum(["light", "dark"]).optional(),
  domain: z.string().optional(),
  path: z.string().optional(),
  sbref: z.string().optional(),
  pref: z.string().optional(),
  sid: z.string().optional(),
  mobile: z.coerce.number().optional(),
});

export const Route = createFileRoute("/widget/bar")({
  validateSearch: search,
  head: () => ({ meta: [
    { title: "Founder network bar — StartupBar" },
    { name: "description", content: "Discover a founder startup through the StartupBar network widget." },
    { property: "og:title", content: "Founder network bar — StartupBar" },
    { property: "og:description", content: "Discover a founder startup through the StartupBar network widget." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: WidgetBar,
});

interface Startup {
  id: string;
  name: string;
  website_url: string;
  description: string;
  logo_url?: string | null;
}

const lightTokens = {
  bg: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#475569",
  labelBg: "#0f172a",
  labelText: "#ffffff",
  iconColor: "#94a3b8",
  infoBg: "#f8fafc",
  infoBorder: "#e2e8f0",
  infoText: "#64748b",
  infoHeading: "#0f172a",
  infoLink: "#0f172a",
};

const darkTokens: typeof lightTokens = {
  bg: "#18181b",
  border: "#27272a",
  text: "#f4f4f5",
  textMuted: "#a1a1aa",
  labelBg: "#f4f4f5",
  labelText: "#18181b",
  iconColor: "#71717a",
  infoBg: "#27272a",
  infoBorder: "#3f3f46",
  infoText: "#a1a1aa",
  infoHeading: "#f4f4f5",
  infoLink: "#f4f4f5",
};

function WidgetBar() {
  const { host, theme: urlTheme, domain, path, sbref, pref, sid, mobile } = useSearch({ from: "/widget/bar" });
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">(urlTheme ?? "light");
  const tokens = activeTheme === "dark" ? darkTokens : lightTokens;
  // Paint the last startup shown in this session immediately so a page
  // navigation never flashes an empty/generic bar. The real pick request
  // still runs and swaps in fresh content (and owns impression counting).
  const cacheKey = `startupbar:last:${host ?? "none"}`;
  const [startup, setStartup] = useState<Startup | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) setStartup(JSON.parse(raw) as Startup);
    } catch {
      /* Storage may be unavailable on embedded sites. */
    }
  }, [cacheKey]);
  const [loaded, setLoaded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [exitAttention, setExitAttention] = useState(false);
  const [placement, setPlacement] = useState<"top" | "bottom">("top");
  const exitUsed = useRef(false);
  const isMobile = mobile === 1;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const startupRef = useRef<Startup | null>(null);
  const showInfoRef = useRef(false);
  const dismissedRef = useRef(false);
  startupRef.current = startup;
  showInfoRef.current = showInfo;
  dismissedRef.current = dismissed;


  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== window.parent) return;
      if (e.data && e.data.type === "startupbar:theme") {
        const t = e.data.theme;
        if (t === "light" || t === "dark") setActiveTheme(t);
      }
      // Exit intent: never expand — just a glance-worthy shake + shimmer on
      // the compact bar, once per session.
      if (e.data?.type === "startupbar:exit" && !exitUsed.current && startupRef.current && !showInfoRef.current && !dismissedRef.current) {
        exitUsed.current = true;
        setExitAttention(true);
        window.setTimeout(() => setExitAttention(false), 1800);
        window.parent.postMessage({ type: "startupbar:exit-opened" }, e.origin);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    window.parent.postMessage({ type: "startupbar:exit-ready", ready: !!startup && !showInfo && !dismissed }, "*");
  }, [startup, showInfo, dismissed]);

  useEffect(() => {
    let cancelled = false;

    async function fetchStartup(): Promise<Startup | null> {
      try {
        const params = new URLSearchParams();
        if (host) params.set("host", host);
        if (domain) params.set("domain", domain);
        if (path) params.set("path", path);
        if (sbref) params.set("sbref", sbref);
        if (pref) params.set("pref", pref);
        if (sid) params.set("sid", sid);
        const res = await fetch(`/api/public/widget/pick?${params.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as (Startup & { placement?: "top" | "bottom" }) | null;
          if (data?.placement) {
            setPlacement(data.placement);
            try {
              window.parent.postMessage({ type: "startupbar:placement", placement: data.placement }, "*");
            } catch { /* ignore */ }
          }
          if (data?.id) {
            try {
              const { id, name, website_url, description, logo_url } = data;
              sessionStorage.setItem(cacheKey, JSON.stringify({ id, name, website_url, description, logo_url }));
            } catch { /* ignore */ }
            return data;
          }
        }
      } catch {
        /* ignore */
      }
      return null;
    }

    (async () => {
      const first = await fetchStartup();
      if (cancelled) return;
      if (first) setStartup(first);
      setLoaded(true);
    })();

    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(async () => {
      if (cancelled) return;
      if (dismissedRef.current || showInfoRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const next = await fetchStartup();
      if (cancelled || !next) return;
      if (next.id === startupRef.current?.id) return;
      setFadeIn(false);
      fadeTimer = setTimeout(() => {
        if (cancelled) return;
        setStartup(next);
        setFadeIn(true);
      }, 500);
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [host]);


  const lastSentHeight = useRef<number>(-1);
  useEffect(() => {
    const send = (h: number, overlay = false) => {
      const rounded = Math.round(h);
      if (rounded === lastSentHeight.current && !overlay) return;
      lastSentHeight.current = rounded;
      window.parent.postMessage({ type: "startupbar:resize", height: rounded, overlay }, "*");
    };

    if (dismissed) {
      send(0);
      return;
    }

    if (!showInfo) {
      send(36);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      send(wrapperRef.current?.scrollHeight || 36);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [dismissed, loaded, showInfo, placement]);



  if (dismissed) return null;

  const barStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 36,
    width: "100%",
    padding: "0 6px",
    background: tokens.bg,
    borderBottom: `1px solid ${tokens.border}`,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 13,
    color: tokens.text,
    boxSizing: "border-box",
  };

  const iconBtnStyle: React.CSSProperties = {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderRadius: 4,
    border: "none",
    background: "none",
    color: tokens.iconColor,
    cursor: "pointer",
    padding: 0,
  };

  const labelStyle: React.CSSProperties = {
    background: tokens.labelBg,
    color: tokens.labelText,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.05em",
    padding: "3px 6px",
    borderRadius: "999px",
    textDecoration: "none",
    flexShrink: 0,
  };

  const arrowLinkBase: React.CSSProperties = {
    flexShrink: 0,
    color: tokens.text,
    textDecoration: "none",
  };

  return (
    <div ref={wrapperRef} className={`sb-widget-shell ${activeTheme === "dark" ? "sb-widget-dark" : ""} ${placement === "bottom" ? "sb-widget-bottom" : ""}`}>
      {isMobile && (
        <style>{`
          @keyframes sb-marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .sb-marquee-track {
            display: inline-flex;
            align-items: center;
            animation: sb-marquee 18s linear infinite;
            will-change: transform;
          }
          .sb-marquee-item { padding-right: 2.5rem; white-space: nowrap; }
        `}</style>
      )}
      <div
        className={`sb-widget-compact ${exitAttention ? "sb-exit-attention" : ""}`}
        style={{ ...barStyle, cursor: startup ? "pointer" : undefined }}
        onClick={() => {
          if (!startup) return;
          const url = `/api/public/widget/click?id=${startup.id}${host ? `&host=${host}` : ""}${domain ? `&via=${encodeURIComponent(domain)}` : ""}`;
          window.open(url, "_blank", "noopener,noreferrer");
        }}
      >
        {/* Info button — always visible */}
        <button onClick={(e) => { e.stopPropagation(); setShowInfo(v => !v); }} aria-label="About StartupBar" style={iconBtnStyle}>
          <Info size={12} />
        </button>

        {/* STARTUPBAR badge — hidden on mobile to save space */}
        {!isMobile && (
          <a onClick={(e) => e.stopPropagation()} href={`/api/public/widget/click?source=badge${host ? `&host=${host}` : ""}${domain ? `&via=${encodeURIComponent(domain)}` : ""}`} target="_blank" rel="noopener noreferrer" style={labelStyle}>
            STARTUPBAR
          </a>
        )}


        {startup ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: 1,
              minWidth: 0,
              opacity: fadeIn ? 1 : 0,
              transition: "opacity 500ms ease-in-out",
            }}
          >
            <StartupFavicon
              url={startup.website_url}
              name={startup.name}
              logoUrl={startup.logo_url}
              size={14}
              className="rounded-sm shrink-0"
            />
            <span style={{ fontWeight: 600, color: tokens.text, flexShrink: 0 }}>{startup.name}</span>

            {/* Description: marquee on mobile, truncated on desktop */}
            {isMobile ? (
              <span style={{ flex: 1, overflow: "hidden", position: "relative", minWidth: 0 }}>
                <span className="sb-marquee-track" style={{ color: tokens.textMuted }}>
                  <span className="sb-marquee-item">· {startup.description}</span>
                  <span className="sb-marquee-item" aria-hidden="true">· {startup.description}</span>
                </span>
              </span>

            ) : (
              <span style={{ color: tokens.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                &nbsp;· {startup.description}
              </span>
            )}

            <a
              onClick={(e) => e.stopPropagation()}
              href={`/api/public/widget/click?id=${startup.id}${host ? `&host=${host}` : ""}${domain ? `&via=${encodeURIComponent(domain)}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...arrowLinkBase, fontWeight: isMobile ? 800 : 500, fontSize: isMobile ? 14 : 12 }}
            >
              Visit →
            </a>
          </div>
        ) : !loaded ? (
          /* First pick still in flight: neutral skeleton, never the generic
             fallback copy (which used to flash on every navigation). */
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }} aria-hidden="true">
            <span style={{ width: 14, height: 14, borderRadius: 3, background: tokens.border, flexShrink: 0 }} />
            <span style={{ width: 80, height: 8, borderRadius: 4, background: tokens.border, flexShrink: 0 }} />
            <span style={{ flex: 1, height: 8, borderRadius: 4, background: tokens.border, minWidth: 0, maxWidth: 260 }} />
          </div>
        ) : (
          <>
            <span style={{ color: tokens.textMuted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Discover founder-built tools — join the free traffic exchange
            </span>
            <a
              href="https://startupbar.co"
              target="_blank"
              rel="noopener noreferrer"
              style={{ flexShrink: 0, fontWeight: 500, color: tokens.text, textDecoration: "none", fontSize: 12 }}
            >
              Join free →
            </a>
          </>
        )}

        {/* X button — desktop only */}
        {!isMobile && (
          <button onClick={(e) => {
            e.stopPropagation();
            window.parent.postMessage({ type: "startupbar:resize", height: 0 }, "*");
            setDismissed(true);
          }} aria-label="Dismiss" style={iconBtnStyle}>
            <X size={11} />
          </button>
        )}
      </div>
      {showInfo && <InfoPanel tokens={tokens} />}
    </div>
  );
}

function InfoPanel({ tokens }: { tokens: typeof lightTokens }) {
  return (
    <div style={{
      borderTop: `1px solid ${tokens.infoBorder}`,
      background: tokens.infoBg,
      padding: "10px 16px 12px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 600, color: tokens.infoHeading }}>Founder-to-founder growth</p>
      <p style={{ margin: "0 0 8px", fontSize: 10, color: tokens.infoText, lineHeight: 1.55 }}>
        This bar shows startups from the <strong style={{ color: tokens.infoHeading }}>StartupBar</strong> network — founders who display each other's startups for free mutual traffic. No ads, no cost.
      </p>
      <a href="https://startupbar.co" target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 10, fontWeight: 600, color: tokens.infoLink, textDecoration: "none" }}>
        Have a startup? Join free →
      </a>
    </div>
  );
}
