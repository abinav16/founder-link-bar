import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { compareTraffic, comparisonWindows } from "../founder-actions";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "compare_startup_performance", title: "Compare my startup performance",
  description: "Compare received/delivered impressions and clicks and CTR for equal seven- or thirty-day UTC periods, excluding today's incomplete day; works across all your startups.",
  inputSchema: { startup_id: z.string().uuid().optional().describe("One owned startup; omit to compare up to 20 owned listings."), period: z.enum(["7d", "30d"]).default("7d").describe("Compare the last complete 7 or 30 UTC days with the preceding equal-length period.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ startup_id, period }, ctx) => {
    const uid = ctx.getUserId(); if (!uid) throw new ToolError("Sign in to compare your startups.");
    const sb = supabaseForUser(ctx);
    let query = sb.from("startups").select("id,name,status").eq("user_id", uid).order("created_at").limit(20);
    if (startup_id) query = query.eq("id", startup_id);
    const { data: startups, error } = await query;
    if (error || (startup_id && !startups?.length)) throw new ToolError("Could not find the requested startups in your account.");
    const windows = comparisonWindows(period === "30d" ? 30 : 7);
    if (!startups?.length) return { content: [{ type: "text", text: "No startups in your account." }], structuredContent: { startups: [] } };
    // Per-startup windows remain below the database response cap.
    const comparisons = await Promise.all(startups.map(async s => {
      const { data, error: dailyError } = await sb.from("startup_stats_daily").select("date,impressions_received,clicks_received,impressions_given,clicks_given").eq("startup_id", s.id).gte("date", windows.previous_start).lte("date", windows.current_end).order("date").limit(60);
      if (dailyError) throw new ToolError("Comparison data is temporarily unavailable.");
      return { startup_id: s.id, name: s.name, approval_status: s.status, ...compareTraffic(data ?? [], windows) };
    }));
    return { content: [{ type: "text", text: JSON.stringify({ windows, comparisons }) }], structuredContent: { windows: { ...windows }, comparisons, zero_baseline: "Percentage change is null when the previous count is zero.", scope: "Up to 20 owned startups, oldest first; today excluded. Request a specific startup ID for other listings." } };
  },
});