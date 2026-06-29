import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { StartupFavicon } from "@/components/StartupFavicon";

const search = z.object({
  host: z.string().uuid().optional(),
  theme: z.enum(["light", "dark"]).optional(),
  domain: z.string().optional(),
});

export const Route = createFileRoute("/widget/bar")({
  validateSearch: search,
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
  const { host, theme: urlTheme, domain } = useSearch({ from: "/widget/bar" });
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">(urlTheme ?? "light");
  const tokens = activeTheme === "dark" ? darkTokens : lightTokens;
  const [startup, setStartup] = useState<Startup | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== window.parent) return;
      if (e.data && e.data.type === "startupbar:theme") {
        const t = e.data.theme;
        if (t === "light" || t === "dark") setActiveTheme(t);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        if (host) params.set("host", host);
        if (domain) params.set("domain", domain);
        const res = await fetch(`/api/public/widget/pick?${params.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as Startup | null;
          if (data?.id) {
            setStartup(data);
          }
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, [host]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const height = dismissed ? 0 : el.scrollHeight;
    window.parent.postMessage({ type: "startupbar:resize", height }, "*");
  }, [showInfo, dismissed, loaded]);

  if (!loaded || dismissed) return null;

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

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div style={barStyle}>
        <button onClick={() => setShowInfo(v => !v)} aria-label="About StartupBar" style={iconBtnStyle}>
          <Info size={12} />
        </button>
        <a href="https://startupbar.co" target="_blank" rel="noopener noreferrer" style={labelStyle}>
          STARTUPBAR
        </a>
        {startup ? (
          <>
            <StartupFavicon
              url={startup.website_url}
              name={startup.name}
              logoUrl={startup.logo_url}
              size={14}
              className="rounded-sm shrink-0"
            />
            <span style={{ fontWeight: 600, color: tokens.text, flexShrink: 0 }}>{startup.name}</span>
            <span style={{ color: tokens.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              &nbsp;— {startup.description}
            </span>
            <a
              href={`/api/public/widget/click?id=${startup.id}${host ? `&host=${host}` : ""}`}
              target="_top"
              style={{ flexShrink: 0, fontWeight: 500, color: tokens.text, textDecoration: "none", fontSize: 12 }}
            >
              Visit →
            </a>
          </>
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
        <button onClick={() => {
          window.parent.postMessage({ type: "startupbar:resize", height: 0 }, "*");
          setDismissed(true);
        }} aria-label="Dismiss" style={iconBtnStyle}>
          <X size={11} />
        </button>
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