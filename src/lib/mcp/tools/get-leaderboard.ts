import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { leaderboardData } from "../leaderboard-data";
import { supabaseForUser } from "../supabase";

export const leaderboardInput = { period: z.enum(["today", "7d", "all"]).default("7d").describe("Today UTC, seven UTC calendar days including today, or all time."), direction: z.enum(["received", "delivered"]).default("received").describe("Rank by impressions received from the network or delivered to others.") };
export default defineTool({
  name: "get_leaderboard", title: "Network leaderboard", description: "List approved non-banned startups ranked by impressions received or delivered, using the website's daily and lifetime counts.",
  inputSchema: { ...leaderboardInput, limit: z.number().int().min(1).max(50).default(20).describe("Maximum ranked startups to return.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ period, direction, limit }, ctx) => {
    const data = await leaderboardData(supabaseForUser(ctx), period, direction);
    const rankings = data.slice(0, limit).map((s, i) => ({ rank: i + 1, startup_id: s.id, name: s.name, impressions: s.impressions, clicks: s.clicks, profile_url: s.slug ? `https://startupbar.co/startup/${s.slug}` : null }));
    return { content: [{ type: "text", text: JSON.stringify({ period, direction, rankings }) }], structuredContent: { period, direction, total_startups: data.length, rankings } };
  },
});