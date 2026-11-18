import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";
import { startupHealth } from "../startup-rules";

export default defineTool({
  name: "list_my_startups",
  title: "My startups",
  description: "Read your own StartupBar listings and their approval and widget-installation status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Sign in to read your startups.");
    const { data, error } = await supabaseForUser(ctx).from("startups")
      .select("id, name, slug, description, website_url, status, category, banned, membership_mode, supporter_until, widget_last_heartbeat_at, widget_currently_visible, iframe_blocked, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
    if (error) throw new ToolError("Could not read your startups. Please try again.");
    const startups = (data ?? []).map(s => ({ id: s.id, name: s.name, description: s.description, website_url: s.website_url, status: s.status, category: s.category, bar_status: startupHealth(s), profile_url: s.slug ? `https://startupbar.co/startup/${s.slug}` : null }));
    return { content: [{ type: "text", text: JSON.stringify({ startups }) }], structuredContent: { startups } };
  },
});