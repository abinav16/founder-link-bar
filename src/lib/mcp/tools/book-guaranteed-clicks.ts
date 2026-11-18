import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { findPack } from "@/lib/checkout-plans";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "book_guaranteed_clicks",
  title: "Book Guaranteed Clicks",
  description: "Create a one-time Guaranteed Clicks checkout link for your approved startup. You must open the secure link and pay yourself; no charge or delivery is triggered by this tool.",
  inputSchema: {
    startup_id: z.string().uuid().describe("Approved startup ID from list_my_startups."),
    clicks: z.union([z.literal(100), z.literal(250), z.literal(500), z.literal(1000)]).describe("One-time pack: 100/$49, 250/$99, 500/$179 or 1000/$299 USD."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  handler: async ({ startup_id, clicks }, ctx) => {
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Sign in to book Guaranteed Clicks.");
    const pack = findPack(clicks);
    if (!pack) throw new ToolError("Choose 100, 250, 500 or 1000 clicks.");
    const { boostCheckout } = await import("@/lib/boost-checkout.server");
    const result = await boostCheckout({ startupId: startup_id, clicks, returnUrl: "https://startupbar.co/dashboard?boost=1" },
      { supabase: supabaseForUser(ctx), userId, email: ctx.getUserEmail() ?? "" });
    if (!result.ok) throw new ToolError(result.reason === "invalid"
      ? "Choose an approved, non-banned startup in your account. No charge was made."
      : "Checkout is unavailable. Retry or choose Guaranteed Clicks from your dashboard. No charge was made.");
    return {
      content: [{ type: "text", text: `${clicks} Guaranteed Clicks — $${pack.priceUsd} USD once. Open this secure link to review and pay: ${result.paymentLink}\nNo charge has been made. Delivery starts only after verified payment. Clicks do not guarantee signups or revenue. Use get_campaign_status to check progress after payment.` }],
      structuredContent: { startup_id, clicks, price_cents: pack.priceUsd * 100, currency: "USD", status: "awaiting_payment", payment_url: result.paymentLink },
    };
  },
});