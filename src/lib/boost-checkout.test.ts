import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
const { admin } = vi.hoisted(() => ({ admin: { from: vi.fn() } }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: admin }));
import { boostCheckout } from "./boost-checkout.server";
const eq = vi.fn();
const maybeSingle = vi.fn();
const chain = { select: vi.fn(), eq, maybeSingle };
const sb = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;
const data = { startupId: "00000000-0000-4000-8000-000000000001", clicks: 100, returnUrl: "https://startupbar.co/dashboard?boost=1" };
beforeEach(() => { vi.clearAllMocks(); chain.select.mockReturnValue(chain); eq.mockReturnValue(chain); });
describe("shared checkout ownership", () => {
  it.each([
    null,
    { user_id: "other", status: "approved", banned: false },
    { user_id: "owner", status: "pending", banned: false },
    { user_id: "owner", status: "approved", banned: true },
  ])("rejects unavailable, foreign, pending or banned listings before privileged writes", async (own) => {
    maybeSingle.mockResolvedValue({ data: own, error: null });
    expect(await boostCheckout(data, { supabase: sb, userId: "owner", email: "" })).toEqual({ ok: false, reason: "invalid" });
    expect(eq).toHaveBeenCalledWith("user_id", "owner");
    expect(admin.from).not.toHaveBeenCalled();
  });
});