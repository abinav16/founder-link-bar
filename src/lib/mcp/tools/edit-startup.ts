import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { editInput, editPatch, ownedLogo } from "../founder-actions";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "edit_startup", title: "Edit my startup",
  description: "Update an owned startup's text, category or previously uploaded logo; approved text edits wait for review while the current listing stays live. Website changes and new logo uploads use Account.",
  inputSchema: editInput,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    const uid = ctx.getUserId();
    if (!uid) throw new ToolError("Sign in to edit your startup.");
    const parsed = editInput.startup_id.safeParse(input.startup_id);
    if (!parsed.success) throw new ToolError("Invalid startup ID.");
    const sb = supabaseForUser(ctx);
    const { data: s, error } = await sb.from("startups").select("id,name,description,status,pending_name,pending_description,category,logo_url").eq("id", input.startup_id).eq("user_id", uid).maybeSingle();
    if (error || !s) throw new ToolError("Startup not found in your account.");
    if (input.logo_url) {
      const { data } = sb.storage.from("startup-logos").getPublicUrl(`${uid}/logo.png`);
      if (!ownedLogo(input.logo_url, data.publicUrl, uid)) throw new ToolError("Use a logo already uploaded to your own StartupBar storage folder, or upload it from Account.");
    }
    const patch = editPatch(s.status, { name: s.pending_name ?? s.name, description: s.pending_description ?? s.description }, input);
    if (!Object.keys(patch).length) return { content: [{ type: "text", text: "No changes requested." }] };
    const { data, error: updateError } = await sb.from("startups").update(patch).eq("id", s.id).eq("user_id", uid).select("id,name,description,pending_name,pending_description,edit_status,status,category,logo_url").single();
    if (updateError || !data) throw new ToolError("Could not save your startup changes.");
    return { content: [{ type: "text", text: "edit_status" in patch && patch.edit_status === "pending" ? "Text changes submitted for review. Your approved listing stays live with its current text; category/logo changes apply immediately." : "Changes saved. Non-approved text changes still require approval." }], structuredContent: { startup: { ...data }, account_url: "https://startupbar.co/account" } };
  },
});