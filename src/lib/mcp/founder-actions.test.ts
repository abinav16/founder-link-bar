import { describe, expect, it } from "vitest";
import { compareTraffic, comparisonWindows, editPatch, ownedLogo, installationAdvice } from "./founder-actions";

describe("founder action safeguards", () => {
  it("keeps approved text live and queues its replacement for review", () => {
    const patch = editPatch("approved", { name: "Old name", description: "Existing description" }, { name: "New name" });
    expect(patch).toMatchObject({ pending_name: "New name", pending_description: "Existing description", edit_status: "pending" });
    expect(patch).not.toHaveProperty("name");
    expect(patch).not.toHaveProperty("status");
  });
  it("requires review for non-approved text changes", () => {
    expect(editPatch("rejected", { name: "Old", description: "Old description" }, { description: "New description" })).toMatchObject({ status: "pending", description: "New description" });
  });
  it("only accepts an existing own-folder logo on the storage origin", () => {
    expect(ownedLogo("https://storage.example/storage/v1/object/public/startup-logos/owner/logo.png", "https://storage.example", "owner")).toBe(true);
    expect(ownedLogo("https://storage.example/storage/v1/object/public/startup-logos/other/logo.png", "https://storage.example", "owner")).toBe(false);
    expect(ownedLogo("https://outside.example/storage/v1/object/public/startup-logos/owner/logo.png", "https://storage.example", "owner")).toBe(false);
  });
  it("compares two complete seven-day UTC periods without today", () => {
    expect(comparisonWindows(7, new Date("2026-11-18T05:13:00Z"))).toEqual({ current_start: "2026-11-11", current_end: "2026-11-17", previous_start: "2026-11-04", previous_end: "2026-11-10", days: 7 });
  });
  it("compares two complete thirty-day UTC periods", () => {
    expect(comparisonWindows(30, new Date("2026-11-18T05:13:00Z"))).toEqual({ current_start: "2026-10-19", current_end: "2026-11-17", previous_start: "2026-09-19", previous_end: "2026-10-18", days: 30 });
  });
  it("excludes today and computes actual received and delivered differences", () => {
    const row = (date: string, n: number) => ({ date, impressions_received: n, clicks_received: n / 10, impressions_given: n * 2, clicks_given: n / 5 });
    const result = compareTraffic([row("2026-11-10", 100), row("2026-11-11", 200), row("2026-11-18", 9990)], comparisonWindows(7, new Date("2026-11-18")));
    expect(result.current.impressions_received).toBe(200);
    expect(result.changes.clicks_received).toEqual({ change: 10, change_percent: 100 });
    expect(result.changes.impressions_delivered.change).toBe(200);
  });
  it("does not invent a percentage over a zero baseline", () => {
    expect(compareTraffic([], comparisonWindows(7)).changes.clicks_received.change_percent).toBeNull();
  });
  it("identifies the wrong startup ID without claiming removal", () => {
    const issues = installationAdvice({ installed: false, idMismatch: true });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("another startup ID");
  });
});