import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { leaderboardData } from "../leaderboard-data";
import { leaderboardInput } from "./get-leaderboard";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_leaderboard_standing", title: "My leaderboard positions", description: "Show the selected-period position of every owned startup and impressions needed to pass the preceding position. Non-approved listings are not ranked.",
  inputSchema: leaderboardInput,
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ period, direction }, ctx) => {
    const uid = ctx.getUserId();
    if (!uid) throw new ToolError("Sign in to read your positions.");
    const sb = supabaseForUser(ctx);
    const [{ data: owned, error }, ranked] = await Promise.all([sb.from("startups").select("id,name,status,banned").eq("user_id", uid).order("created_at").limit(100), leaderboardData(sb, period, direction)]);
    if (error) throw new ToolError("Could not read your listings.");
    const startups = (owned ?? []).map(s => {
      const index = ranked.findIndex(r => r.id === s.id);
      const row = ranked[index];
      const previous = index > 0 ? ranked[index - 1] : undefined;
      return { startup_id: s.id, name: s.name, approval_status: s.status, rank: row ? index + 1 : null, impressions: row?.impressions ?? 0, clicks: row?.clicks ?? 0, impressions_to_pass_next: row && previous ? Math.max(0, previous.impressions - row.impressions + 1) : null, profile_url: row?.slug ? `https://startupbar.co/startup/${row.slug}` : null };
    });
    return { content: [{ type: "text", text: JSON.stringify({ period, direction, startups }) }], structuredContent: { period, direction, total_ranked: ranked.length, startups } };
  },
});