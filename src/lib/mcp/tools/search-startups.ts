import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_startups",
  title: "Search the network",
  description: "Find approved non-banned startup listings in the StartupBar directory.",
  inputSchema: { query: z.string().max(100).default("").describe("Startup name to search for; omit to browse recent listings."), limit: z.number().int().min(1).max(50).default(20).describe("Maximum number of listings to return.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    let request = supabaseForUser(ctx).from("startups").select("id, slug, name, description, website_url, category")
      .eq("status", "approved").eq("banned", false).order("created_at", { ascending: false }).limit(limit);
    if (query) request = request.ilike("name", `%${query.replace(/[\\%_]/g, "\\$&")}%`);
    const { data, error } = await request;
    if (error) throw new ToolError("Could not search the network. Please try again.");
    const startups = (data ?? []).map(s => ({ id: s.id, slug: s.slug, name: s.name, description: s.description, website_url: s.website_url, category: s.category }));
    return { content: [{ type: "text", text: JSON.stringify({ startups }) }], structuredContent: { startups } };
  },
});