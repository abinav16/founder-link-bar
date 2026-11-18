import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { ADDITIONAL_LISTING_PRICE_USD, DEFAULT_PLAN } from "@/lib/checkout-plans";
import { installationAccepted, startupInput } from "../startup-rules";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "submit_startup",
  title: "Add a startup",
  description: "Prepare a startup application and return its install snippet. Call again with submit=true after installation to submit for review. Additional listings require verified prepaid payment; this tool never charges you.",
  inputSchema: { ...startupInput, submit: z.boolean().default(false).describe("False prepares the application; true verifies installation and submits it for review."), startup_id: z.string().uuid().optional().describe("Use the ID returned during preparation when submitting."), placement: z.enum(["top", "bottom"]).default("top").describe("Position of the visible bar on your website.") },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  handler: async ({ name, website_url, description, category, submit, startup_id, placement }, ctx) => {
    const uid = ctx.getUserId();
    if (!uid) throw new ToolError("Sign in to add your startup.");
    if (submit && !startup_id) throw new ToolError("Prepare the application first, then pass its startup_id.");
    const sb = supabaseForUser(ctx);
    const { data: existing, error: lookupError } = await sb.from("startups").select("id,status,name").eq("user_id", uid).eq("website_url", website_url).limit(1);
    if (lookupError) throw new ToolError("Could not check your existing listings.");
    const found = existing?.[0];
    if (found) return { content: [{ type: "text", text: `Already listed: ${found.name} (${found.status}). Manage it at https://startupbar.co/dashboard. No new payment was consumed.` }], structuredContent: { startup_id: found.id, status: found.status, already_submitted: true } };

    let id = startup_id;
    if (!id) {
      const { data: drafts, error } = await sb.from("application_drafts").select("startup_id").eq("user_id", uid).eq("website_url", website_url).is("submitted_at", null).order("created_at", { ascending: false }).limit(1);
      if (error) throw new ToolError("Could not read your application drafts.");
      id = drafts?.[0]?.startup_id ?? crypto.randomUUID();
    }
    if (submit) {
      const { data: draft, error } = await sb.from("application_drafts").select("name,website_url,description,category,placement").eq("startup_id", id).eq("user_id", uid).maybeSingle();
      if (error || !draft) throw new ToolError("Application draft not found in your account.");
      if (draft.name !== name || draft.website_url !== website_url || draft.description !== description || draft.category !== category || draft.placement !== placement) throw new ToolError("Application details changed. Prepare it again before submitting.");
    } else {
      const { error } = await sb.from("application_drafts").upsert({ startup_id: id, user_id: uid, name, website_url, description, category, placement, mode: "widget", checkout_plan: DEFAULT_PLAN, updated_at: new Date().toISOString() }, { onConflict: "startup_id" });
      if (error) throw new ToolError("Could not save this application in your account.");
    }
    const snippet = `<script async src="https://startupbar.co/widget/loader.js" data-startup-id="${id}"></script>`;
    const handoff = new URLSearchParams({ resume: "1", sid: id, name, url: website_url, desc: description, cat: category, placement });
    const continue_url = `https://startupbar.co/apply?${handoff}`;
    const [{ count, error: countError }, { data: credits, error: creditError }] = await Promise.all([
      sb.from("startups").select("id", { count: "exact", head: true }).eq("user_id", uid),
      sb.from("payments").select("id").eq("user_id", uid).eq("status", "succeeded").is("consumed_at", null).limit(1),
    ]);
    if (countError || creditError) throw new ToolError("Could not verify listing eligibility. Your draft is saved.");
    const paymentRequired = (count ?? 0) > 0 && !credits?.length;
    if (!submit || paymentRequired) {
      const status = paymentRequired ? "payment_required" : "installation_required";
      return { content: [{ type: "text", text: paymentRequired ? `Application saved. This additional listing requires $${ADDITIONAL_LISTING_PRICE_USD}. Install the snippet, then finish verification and payment at ${continue_url}. No charge was made.\n${snippet}` : `Application saved, not submitted. Install this snippet on your published website, then call submit_startup with startup_id=${id} and submit=true. First listing is free; approval is still required.\n${snippet}\nContinue in the app: ${continue_url}` }], structuredContent: { startup_id: id, status, snippet, continue_url, listing_fee_usd: paymentRequired ? ADDITIONAL_LISTING_PRICE_USD : 0 } };
    }
    const token = ctx.getToken();
    if (!token) throw new ToolError("Reconnect your account before submitting.");
    let verification: Record<string, unknown>;
    try {
      const response = await fetch(`https://startupbar.co/api/public/verify-install?url=${encodeURIComponent(website_url)}&id=${id}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.any([ctx.signal, AbortSignal.timeout(20000)]) });
      if (!response.ok) throw new Error("Verification unavailable");
      verification = await response.json();
    } catch { throw new ToolError(`Installation could not be checked. Your draft is saved; continue at ${continue_url}.`); }
    if (!installationAccepted(verification)) return { content: [{ type: "text", text: `Not submitted: the matching visible bar installation could not be confirmed. Check installation at ${continue_url}. No payment was consumed.` }], structuredContent: { startup_id: id, status: "installation_required", snippet, continue_url } };
    const { data: result, error } = await sb.rpc("mcp_submit_startup", { _startup_id: id });
    if (error || !result || typeof result !== "object" || Array.isArray(result)) throw new ToolError("Could not submit the saved application. Retry or continue in the app; payment and creation are atomic.");
    const status = result.status;
    return { content: [{ type: "text", text: status === "payment_required" ? `Your draft is saved; complete the additional-listing payment at ${continue_url}.` : `Startup ${status === "already_submitted" ? "was already submitted" : "submitted for review"}. Approval is not automatic. View it at https://startupbar.co/dashboard.` }], structuredContent: { startup_id: typeof result.startup_id === "string" ? result.startup_id : id, status: typeof status === "string" ? status : "unknown", snippet, continue_url } };
  },
});