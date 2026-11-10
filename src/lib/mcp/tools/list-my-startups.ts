import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

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
      .select("id, name, website_url, status, category, widget_last_heartbeat_at, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
    if (error) throw new ToolError("Could not read your startups. Please try again.");
    const startups = (data ?? []).map(s => ({ id: s.id, name: s.name, website_url: s.website_url, status: s.status, category: s.category, last_widget_heartbeat: s.widget_last_heartbeat_at }));
    return { content: [{ type: "text", text: JSON.stringify({ startups }) }], structuredContent: { startups } };
  },
});