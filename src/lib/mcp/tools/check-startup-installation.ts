import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { installationAccepted, startupHealth } from "../startup-rules";
import { installationAdvice } from "../founder-actions";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "check_startup_installation", title: "Check my bar installation",
  description: "Check an owned startup's published website and explain installation problems with a matching snippet; missing scan evidence does not prove removal, and Supporter listings may not require a bar.",
  inputSchema: { startup_id: z.string().uuid().describe("Owned startup ID to diagnose.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ startup_id }, ctx) => {
    const uid = ctx.getUserId(); if (!uid) throw new ToolError("Sign in to check installation.");
    const { data: s, error } = await supabaseForUser(ctx).from("startups").select("id,website_url,status,banned,membership_mode,supporter_until,iframe_blocked,widget_currently_visible,widget_last_heartbeat_at").eq("id", startup_id).eq("user_id", uid).maybeSingle();
    if (error || !s) throw new ToolError("Startup not found in your account.");
    const snippet = `<script async src="https://startupbar.co/widget/loader.js" data-startup-id="${s.id}"></script>`;
    const bar_status = startupHealth(s);
    if (bar_status === "Supporter — no visible bar required") return { content: [{ type: "text", text: bar_status }], structuredContent: { startup_id, bar_status, visible_bar_required: false } };
    const token = ctx.getToken(); if (!token) throw new ToolError("Reconnect your account to check installation.");
    let evidence: Record<string, unknown>;
    try {
      const response = await fetch(`https://startupbar.co/api/public/verify-install?url=${encodeURIComponent(s.website_url)}&id=${s.id}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.any([ctx.signal, AbortSignal.timeout(20000)]) });
      if (!response.ok) throw new Error("Unavailable");
      evidence = await response.json();
    } catch { return { content: [{ type: "text", text: "The website check is unavailable. This does not prove your bar was removed. Retry or check installation from your Account." }], structuredContent: { startup_id, bar_status, scan_status: "unavailable", snippet, account_url: "https://startupbar.co/account" } }; }
    const issues = installationAdvice(evidence);
    const confirmed = installationAccepted(evidence);
    const report = { startup_id, bar_status, scan_status: confirmed ? "installation_confirmed" : "needs_review", issues, snippet, account_url: "https://startupbar.co/account", caution: "A negative static scan does not prove removal. No listing, approval or billing changes were made." };
    return { content: [{ type: "text", text: JSON.stringify(report) }], structuredContent: { report } };
  },
});