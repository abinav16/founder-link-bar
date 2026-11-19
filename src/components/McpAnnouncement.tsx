import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import claudeIcon from "@/assets/claude-ai-icon.png.asset.json";

export function McpAnnouncement() {
  return <aside className="mcp-announcement" aria-label="StartupBar MCP announcement">
    <div className="mcp-announcement-inner">
      <span className="mcp-announcement-icon" aria-hidden="true"><img src={claudeIcon.url} alt="" width={20} height={20} className="mcp-announcement-logo" /></span>
      <p><strong>StartupBar is an official Claude connector.</strong><span> Your startups. Your stats. Inside your AI assistant.</span></p>
      <Button asChild variant="ghost" className="mcp-announcement-link"><Link to="/docs/mcp">Add to Claude <ArrowUpRight size={16} /></Link></Button>
    </div>
  </aside>;
}
