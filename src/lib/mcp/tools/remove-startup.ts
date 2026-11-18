import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "remove_startup", title: "Request startup removal",
  description: "Prepare removal of an owned listing and open its Account confirmation link. Nothing is deleted by this tool; the user must confirm on the website. Removal does not cancel subscriptions or promise refunds.",
  inputSchema: { startup_id: z.string().uuid().describe("Owned startup ID to remove." ) },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ startup_id }, ctx) => {
    const uid = ctx.getUserId();
    if (!uid) throw new ToolError("Sign in to request removal.");
    const { data: s, error } = await supabaseForUser(ctx).from("startups").select("id,name").eq("id", startup_id).eq("user_id", uid).maybeSingle();
    if (error || !s) throw new ToolError("Startup not found in your account.");
    const confirmation_url = `https://startupbar.co/account?remove=${s.id}`;
    return { content: [{ type: "text", text: `Awaiting your confirmation to permanently delete ${s.name}. Open ${confirmation_url} and review the consequences before choosing Yes, delete. No deletion, refund or billing cancellation has occurred.` }], structuredContent: { startup_id: s.id, name: s.name, status: "awaiting_confirmation", confirmation_url } };
  },
});