import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { startupHealth, trafficJson, utcWindowStart } from "../startup-rules";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_startup_performance", title: "Startup performance",
  description: "Read one owned startup's approval and bar status, impressions and clicks received and delivered, CTR, daily history and guaranteed-click progress. Seven/thirty-day periods include today in UTC, not rolling hours.",
  inputSchema: { startup_id: z.string().uuid().describe("Owned startup ID from list_my_startups."), period: z.enum(["7d", "30d", "all"]).default("7d").describe("Seven or thirty UTC calendar days including today, or all time.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ startup_id, period }, ctx) => {
    const uid = ctx.getUserId();
    if (!uid) throw new ToolError("Sign in to read performance.");
    const sb = supabaseForUser(ctx);
    const { data: s, error } = await sb.from("startups").select("id,name,slug,description,website_url,category,status,banned,rejection_reason,membership_mode,supporter_until,widget_currently_visible,iframe_blocked,widget_last_heartbeat_at").eq("id", startup_id).eq("user_id", uid).maybeSingle();
    if (error || !s) throw new ToolError("Startup not found in your account.");
    const today = new Date().toISOString().slice(0, 10);
    const since = utcWindowStart(period === "30d" ? 30 : 7);
    const [totals, daily, boosts] = await Promise.all([
      sb.from("startup_stats_totals").select("impressions_received,clicks_received,impressions_given,clicks_given").eq("startup_id", startup_id).maybeSingle(),
      sb.from("startup_stats_daily").select("date,impressions_received,clicks_received,impressions_given,clicks_given").eq("startup_id", startup_id).gte("date", since).lte("date", today).order("date"),
      sb.from("click_boosts").select("id,status,clicks_purchased,clicks_delivered").eq("startup_id", startup_id).eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
    ]);
    if (totals.error || daily.error || boosts.error) throw new ToolError("Performance is temporarily unavailable; no counts were substituted.");
    const zero = { impressions_received: 0, clicks_received: 0, impressions_given: 0, clicks_given: 0 };
    const counts = period === "all" ? totals.data ?? zero : (daily.data ?? []).reduce((a, r) => ({ impressions_received: a.impressions_received + Number(r.impressions_received), clicks_received: a.clicks_received + Number(r.clicks_received), impressions_given: a.impressions_given + Number(r.impressions_given), clicks_given: a.clicks_given + Number(r.clicks_given) }), zero);
    const performance = { startup_id, name: s.name, description: s.description, website_url: s.website_url, category: s.category, profile_url: s.slug ? `https://startupbar.co/startup/${s.slug}` : null, approval_status: s.status, rejection_reason: s.rejection_reason, bar_status: startupHealth(s), period, period_start_utc: period === "all" ? null : since, period_end_utc: today, ...trafficJson(counts), daily_history: (daily.data ?? []).map(r => ({ date_utc: r.date, ...trafficJson(r) })), daily_history_period: period === "all" ? "Last 7 UTC calendar days" : period, guaranteed_clicks: (boosts.data ?? []).map(b => ({ id: b.id, status: b.status, purchased: b.clicks_purchased, delivered: b.clicks_delivered, remaining: Math.max(0, b.clicks_purchased - b.clicks_delivered) })) };
    return { content: [{ type: "text", text: JSON.stringify(performance) }], structuredContent: { performance } };
  },
});