import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolContext } from "@lovable.dev/mcp-js";
const { client, response, chain } = vi.hoisted(() => ({ client: { from: vi.fn() }, response: { data: null as unknown, error: null }, chain: { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), update: vi.fn(), delete: vi.fn() } }));
vi.mock("../supabase", () => ({ supabaseForUser: () => client }));
import remove from "./remove-startup";
import edit from "./edit-startup";
import campaign from "./get-campaign-status";
import installation from "./check-startup-installation";
const context = { getUserId: () => "owner" } as ToolContext;
const startup_id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks(); response.data = null;
  client.from.mockReturnValue(chain);
  chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain);
  chain.maybeSingle.mockImplementation(async () => response);
});
describe("founder tool authorization", () => {
  it("refuses removal of a startup not found in the caller account", async () => {
    await expect(remove.handler({ startup_id }, context)).rejects.toThrow("Startup not found in your account");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(chain.delete).not.toHaveBeenCalled();
  });
  it("returns a confirmation link but never performs deletion", async () => {
    response.data = { id: startup_id, name: "Owned listing" };
    const result = await remove.handler({ startup_id }, context);
    expect(result.structuredContent).toMatchObject({ status: "awaiting_confirmation", confirmation_url: `https://startupbar.co/account?remove=${startup_id}` });
    expect(chain.delete).not.toHaveBeenCalled();
  });
  it("refuses edits outside the caller account", async () => {
    await expect(edit.handler({ startup_id, name: "New name", description: undefined, category: undefined, logo_url: undefined }, context)).rejects.toThrow("Startup not found in your account");
    expect(chain.update).not.toHaveBeenCalled();
  });
  it("refuses campaign filters targeting another owner", async () => {
    await expect(campaign.handler({ startup_id, limit: 20 }, context)).rejects.toThrow("Startup not found in your account");
    expect(client.from).toHaveBeenCalledTimes(1);
  });
  it("refuses installation checks outside the caller account", async () => {
    await expect(installation.handler({ startup_id }, context)).rejects.toThrow("Startup not found in your account");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "owner");
  });
});