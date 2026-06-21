import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const search = z.object({
  host: z.string().uuid().optional(),
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
}

function WidgetBar() {
  const { host } = useSearch({ from: "/widget/bar" });
  const [startup, setStartup] = useState<Startup | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        if (host) params.set("host", host);
        const res = await fetch(`/api/public/widget/pick?${params.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as Startup | null;
          if (data?.id) {
            setStartup(data);
            supabase.from("impressions").insert({
              shown_startup_id: data.id,
              host_startup_id: host ?? null,
            }).then(() => {});
          }
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, [host]);

  if (!loaded || dismissed) return null;

  if (loaded && !startup) {
    return (
      <div style={{ position: "relative", width: "100%" }}>
        <div style={barStyle}>
          <button onClick={() => setShowInfo(v => !v)} aria-label="What is this?" style={iconBtnStyle}>
            <Info size={12} />
          </button>
          <a href="https://startupbar.co" target="_blank" rel="noopener noreferrer" style={labelStyle}>STARTUPBAR</a>
          <span style={{ color: "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Discover founder-built tools — join the free traffic exchange
          </span>
          <a href="https://startupbar.co" target="_blank" rel="noopener noreferrer"
            style={{ flexShrink: 0, fontWeight: 500, color: "#0f172a", textDecoration: "none", fontSize: 12 }}>
            Join free →
          </a>
          <button onClick={() => setDismissed(true)} aria-label="Dismiss" style={iconBtnStyle}>
            <X size={11} />
          </button>
        </div>
        {showInfo && <InfoPanel />}
      </div>
    );
  }

  const clickUrl = `/api/public/widget/click?id=${startup!.id}${host ? `&host=${host}` : ""}`;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div style={barStyle}>
        <button onClick={() => setShowInfo(v => !v)} aria-label="About StartupBar" style={iconBtnStyle}>
          <Info size={12} />
        </button>
        <a href="https://startupbar.co" target="_blank" rel="noopener noreferrer" style={labelStyle}>
          STARTUPBAR
        </a>
        <span style={{ fontWeight: 600, color: "#0f172a", flexShrink: 0 }}>{startup!.name}</span>
        <span style={{ color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          &nbsp;— {startup!.description}
        </span>
        <a href={clickUrl} target="_top"
          style={{ flexShrink: 0, fontWeight: 500, color: "#0f172a", textDecoration: "none", fontSize: 12 }}>
          Visit →
        </a>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" style={iconBtnStyle}>
          <X size={11} />
        </button>
      </div>
      {showInfo && <InfoPanel />}
    </div>
  );
}

function InfoPanel() {
  return (
    <div style={{
      borderTop: "1px solid #e2e8f0",
      background: "#f8fafc",
      padding: "10px 16px 12px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 600, color: "#0f172a" }}>Founder-to-founder growth</p>
      <p style={{ margin: "0 0 8px", fontSize: 10, color: "#64748b", lineHeight: 1.55 }}>
        This bar shows startups from the <strong style={{ color: "#0f172a" }}>StartupBar</strong> network — founders who display each other's startups for free mutual traffic. No ads, no cost.
      </p>
      <a href="https://startupbar.co" target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 10, fontWeight: 600, color: "#0f172a", textDecoration: "none" }}>
        Have a startup? Join free →
      </a>
    </div>
  );
}

const barStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  height: 36,
  width: "100%",
  padding: "0 6px",
  background: "#ffffff",
  borderBottom: "1px solid #e2e8f0",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: 13,
  color: "#0f172a",
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
  color: "#94a3b8",
  cursor: "pointer",
  padding: 0,
};

const labelStyle: React.CSSProperties = {
  background: "#0f172a",
  color: "#ffffff",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.05em",
  padding: "3px 6px",
  borderRadius: 3,
  textDecoration: "none",
  flexShrink: 0,
};
