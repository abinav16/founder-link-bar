import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_campaign_status", title: "My campaign status",
  description: "Read your guaranteed-click delivery, banner review/dates/actual traffic, and newsletter booking statuses without charging, booking or changing campaigns.",
  inputSchema: { startup_id: z.string().uuid().optional().describe("Filter clicks and newsletters to one owned startup. Banners are account-wide and are explicitly labeled."), limit: z.number().int().min(1).max(50).default(20).describe("Maximum records per campaign type, newest first.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ startup_id, limit }, ctx) => {
    const uid = ctx.getUserId(); if (!uid) throw new ToolError("Sign in to read your campaigns.");
    const sb = supabaseForUser(ctx);
    if (startup_id) {
      const { data, error } = await sb.from("startups").select("id").eq("id", startup_id).eq("user_id", uid).maybeSingle();
      if (error || !data) throw new ToolError("Startup not found in your account.");
    }
    let clicks = sb.from("click_boosts").select("id,startup_id,status,clicks_purchased,clicks_delivered,price_cents,activated_at,completed_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(limit);
    let newsletters = sb.from("newsletter_sponsorships").select("id,startup_id,status,send_date,recipients,price_cents").eq("user_id", uid).order("created_at", { ascending: false }).limit(limit);
    if (startup_id) { clicks = clicks.eq("startup_id", startup_id); newsletters = newsletters.eq("startup_id", startup_id); }
    const [c, n, b] = await Promise.all([clicks, newsletters, sb.from("ad_campaigns").select("id,advertiser_name,status,weeks,budget_cents,paid_at,approved_at,starts_at,expires_at,impressions,clicks,rejection_reason").eq("user_id", uid).order("created_at", { ascending: false }).limit(limit)]);
    if (c.error || n.error || b.error) throw new ToolError("Campaign status is temporarily unavailable; no results were substituted.");
    const campaigns = {
      guaranteed_clicks: (c.data ?? []).map(r => ({ ...r, remaining: Math.max(0, r.clicks_purchased - r.clicks_delivered) })),
      newsletters: (n.data ?? []).map(r => ({ ...r })),
      banners_account_wide: (b.data ?? []).map(r => ({ ...r })),
      currency: "USD", amounts: "Stored cents; newsletter recipient count is the booked audience, not proof of delivery or opens.",
      scope: startup_id ? "Clicks and newsletters filtered to startup; banners are account-wide." : "Your account campaigns.",
      truncated_if_count_equals_limit: limit,
    };
    return { content: [{ type: "text", text: JSON.stringify(campaigns) }], structuredContent: { campaigns } };
  },
});