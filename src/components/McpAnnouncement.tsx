import { Link } from "@tanstack/react-router";
import { ArrowUpRight, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function McpAnnouncement() {
  return <aside className="mcp-announcement" aria-label="StartupBar MCP announcement">
    <div className="mcp-announcement-inner">
      <span className="mcp-announcement-icon" aria-hidden="true"><PlugZap size={18} /></span>
      <p><strong>StartupBar MCP is here.</strong><span> Your startups. Your stats. Inside your AI assistant.</span></p>
      <Button asChild variant="ghost" className="mcp-announcement-link"><Link to="/docs/mcp">Explore MCP <ArrowUpRight size={16} /></Link></Button>
    </div>
  </aside>;
}