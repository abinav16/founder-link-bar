import { describe, expect, it } from "vitest";
import { buildMilestoneFeed } from "./network-milestones";
const now = Date.parse("2026-11-18T12:00:00Z");
const startup = { id: "one", created_at: "2026-08-01T12:00:00Z", clicks: 26, impressions: 1100 };
describe("seven-day founder milestones", () => {
  it("includes all seven UTC days but excludes older milestones", () => {
    const rows = [{ ...startup, created_at: "2026-11-12T00:00:00Z" }, { ...startup, id: "old", created_at: "2026-11-11T23:59:59Z" }];
    expect(buildMilestoneFeed(rows, [], now).map(f => f.startupId)).toEqual(["one"]);
  });
  it("dates each click and view crossing from its recorded day", () => {
    const feed = buildMilestoneFeed([startup], [{ startup_id: "one", day_offset: 6, clicks: 10, received: 100 }, { startup_id: "one", day_offset: 2, clicks: 16, received: 1000 }], now);
    expect(feed.find(f => f.key === "one:click:1")?.when).toBe("6d ago");
    expect(feed.find(f => f.key === "one:click:25")?.when).toBe("2d ago");
    expect(feed.find(f => f.key === "one:view:1000")?.when).toBe("2d ago");
  });
  it("does not relabel lifetime achievements as recent without daily evidence", () => {
    expect(buildMilestoneFeed([startup], [], now)).toEqual([]);
  });
  it("includes recent anniversaries and excludes future anniversaries", () => {
    const feed = buildMilestoneFeed([{ ...startup, created_at: "2026-11-05T12:00:00Z" }], [], now);
    expect(feed.map(f => f.text)).toEqual(["7 days in the network"]);
  });
});