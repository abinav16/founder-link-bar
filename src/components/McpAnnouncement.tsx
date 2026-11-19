import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import claudeIcon from "@/assets/claude-ai-icon.png.asset.json";

export const CLAUDE_CONNECTOR_URL = "https://claude.ai/directory/connectors/startupbar";

export function McpAnnouncement() {
  return <aside className="mcp-announcement" aria-label="StartupBar MCP announcement">
    <div className="mcp-announcement-inner">
      <span className="mcp-announcement-icon" aria-hidden="true"><img src={claudeIcon.url} alt="" width={20} height={20} className="mcp-announcement-logo" /></span>
      <p><strong>StartupBar is an official Claude connector.</strong><span> Your startups. Your stats. Inside your AI assistant.</span></p>
      <Button asChild variant="ghost" className="mcp-announcement-link"><a href={CLAUDE_CONNECTOR_URL} target="_blank" rel="noopener noreferrer">Add to Claude <ArrowUpRight size={16} /></a></Button>
      <Button asChild variant="ghost" className="mcp-announcement-guide"><Link to="/docs/mcp">Setup guide</Link></Button>
    </div>
  </aside>;
}
