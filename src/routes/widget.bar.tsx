import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const search = z.object({ host: z.string().uuid().optional() });
export const Route = createFileRoute("/widget/bar")({ validateSearch: search, component: WidgetBar });

interface Startup { id: string; name: string; website_url: string; description: string; }

function WidgetBar() {
  const { host } = useSearch({ from: "/widget/bar" });
  const [startup, setStartup] = useState<Startup | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(); if (host) params.set("host", host);
      const res = await fetch(`/api/public/widget/pick?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as Startup | null;
      if (!data) return;
      setStartup(data);
      supabase.from("impressions").insert({ shown_startup_id: data.id, host_startup_id: host ?? null }).then(() => {});
    })();
  }, [host]);

  if (!startup) return (<div style={barStyle}><div style={labelStyle}>STARTUPBAR</div><div style={{ color: "#64748b", fontSize: 13 }}>Loading…</div></div>);

  const clickUrl = `/api/public/widget/click?id=${startup.id}${host ? `&host=${host}` : ""}`;

  return (
    <div style={barStyle}>
      <a href="https://startupbar.co" target="_blank" rel="noopener noreferrer" style={labelStyle}>STARTUPBAR</a>
      <span style={{ fontWeight: 600, color: "#0f172a" }}>{startup.name}</span>
      <span style={{ color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>— {startup.description}</span>
      <a href={clickUrl} target="_top" style={{ fontWeight: 500, color: "#0f172a", textDecoration: "none", padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: 6, background: "#ffffff", fontSize: 12 }}>Visit →</a>
      <button onClick={() => setShowInfo((v) => !v)} aria-label="About StartupBar" style={{ width: 18, height: 18, borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", color: "#64748b", fontSize: 11, cursor: "pointer", padding: 0, lineHeight: "16px" }}>i</button>
      {showInfo && (<div style={{ position: "absolute", right: 8, top: 36, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, fontSize: 12, color: "#475569", maxWidth: 260, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>StartupBar is a free traffic exchange between founders.{" "}<a href="https://startupbar.co" target="_blank" rel="noopener noreferrer" style={{ color: "#0f172a" }}>Learn more</a></div>)}
    </div>
  );
}

const barStyle: React.CSSProperties = { position: "relative", display: "flex", alignItems: "center", gap: 10, height: 36, width: "100%", padding: "0 12px", background: "#ffffff", borderBottom: "1px solid #e2e8f0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, color: "#0f172a", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { background: "#0f172a", color: "#ffffff", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", padding: "3px 6px", borderRadius: 3, textDecoration: "none", flexShrink: 0 };
