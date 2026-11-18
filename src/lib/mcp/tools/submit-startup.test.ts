import { beforeEach, describe, expect, it, vi } from "vitest";
const { client, responses } = vi.hoisted(() => ({ client: { from: vi.fn(), rpc: vi.fn() }, responses: [] as unknown[] }));
vi.mock("../supabase", () => ({ supabaseForUser: () => client }));
import submitTool from "./submit-startup";
import type { ToolContext, ToolHandlerResult } from "@lovable.dev/mcp-js";

const input = { name: "QuickDocs", website_url: "https://quickdocs.dev", description: "Instant developer documentation", category: "Developer Tools" as const, submit: false, startup_id: undefined, placement: "top" as const };
function fields(result: ToolHandlerResult) {
  const value = result.structuredContent;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected structured tool fields");
  return value;
}
const context = { getUserId: () => "owner", getToken: () => "not-a-real-token", signal: new AbortController().signal } as ToolContext;
beforeEach(() => {
  vi.clearAllMocks(); responses.length = 0;
  client.from.mockImplementation(() => {
    const result = responses.shift();
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "order", "limit", "upsert", "maybeSingle"]) chain[method] = () => chain;
    chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return chain;
  });
});
describe("startup submission handoff", () => {
  it("keeps additional listings at $9.99 and does not submit or consume payment", async () => {
    responses.push({ data: [] }, { data: [] }, { error: null }, { count: 2 }, { data: [] });
    const result = fields(await submitTool.handler(input, context));
    expect(result.listing_fee_usd).toBe(9.99);
    expect(result.status).toBe("payment_required");
    expect(client.rpc).not.toHaveBeenCalled();
    const url = new URL(String(result.continue_url));
    expect(url.searchParams.get("resume")).toBe("1");
    expect(url.searchParams.get("sid")).toBe(result.startup_id);
  });
  it("prepares the first listing free without submitting it", async () => {
    responses.push({ data: [] }, { data: [] }, { error: null }, { count: 0 }, { data: [] });
    const result = fields(await submitTool.handler(input, context));
    expect(result.listing_fee_usd).toBe(0);
    expect(result.status).toBe("installation_required");
    expect(client.rpc).not.toHaveBeenCalled();
  });
  it("does not consume another payment for an already listed startup", async () => {
    responses.push({ data: [{ id: "existing", name: "QuickDocs", status: "pending" }] });
    const result = fields(await submitTool.handler(input, context));
    expect(result.already_submitted).toBe(true);
    expect(client.from).toHaveBeenCalledTimes(1);
    expect(client.rpc).not.toHaveBeenCalled();
  });
});