import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolContext } from "@lovable.dev/mcp-js";
const { checkout, client } = vi.hoisted(() => ({ checkout: vi.fn(), client: {} }));
vi.mock("@/lib/boost-checkout.server", () => ({ boostCheckout: checkout }));
vi.mock("../supabase", () => ({ supabaseForUser: () => client }));
import tool from "./book-guaranteed-clicks";
const startup_id = "00000000-0000-4000-8000-000000000001";
const ctx = { getUserId: () => "owner", getUserEmail: () => "founder@example.test" } as ToolContext;
beforeEach(() => vi.clearAllMocks());
describe("Guaranteed Clicks booking", () => {
  it.each([[100, 4900], [250, 9900], [500, 17900], [1000, 29900]] as const)("returns a %i-click one-time checkout at %i cents", async (clicks, cents) => {
    checkout.mockResolvedValue({ ok: true, paymentLink: "https://checkout.example.test/payment" });
    const result = await tool.handler({ startup_id, clicks }, ctx);
    expect(result.structuredContent).toMatchObject({ clicks, price_cents: cents, currency: "USD", status: "awaiting_payment" });
    expect(checkout).toHaveBeenCalledWith({ startupId: startup_id, clicks, returnUrl: "https://startupbar.co/dashboard?boost=1" }, { supabase: client, userId: "owner", email: "founder@example.test" });
  });
  it("rejects a signed-out caller before checkout", async () => {
    await expect(tool.handler({ startup_id, clicks: 100 }, { getUserId: () => undefined } as ToolContext)).rejects.toThrow("Sign in");
    expect(checkout).not.toHaveBeenCalled();
  });
  it("rejects unsupported packs before checkout", async () => {
    if (!tool.inputSchema) throw new Error("Expected booking schema");
    expect(tool.inputSchema.clicks.safeParse(101).success).toBe(false);
    expect(checkout).not.toHaveBeenCalled();
  });
  it("does not claim success for an ineligible startup", async () => {
    checkout.mockResolvedValue({ ok: false, reason: "invalid" });
    await expect(tool.handler({ startup_id, clicks: 100 }, ctx)).rejects.toThrow("in your account");
  });
});