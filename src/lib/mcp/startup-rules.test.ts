import { describe, expect, it } from "vitest";
import { z } from "zod";
import { installationAccepted, startupHealth, startupInput, trafficJson, utcWindowStart } from "./startup-rules";

describe("agent startup rules", () => {
  it("uses the same description limit as applications", () => {
    const schema = z.object(startupInput);
    const input = { name: "QuickDocs", website_url: "https://quickdocs.dev", description: "Instant developer documentation", category: "Developer Tools" };
    expect(schema.safeParse(input).success).toBe(true);
    expect(schema.safeParse({ ...input, description: "a".repeat(101) }).success).toBe(false);
  });
  it("does not submit a missing or blocked installation", () => {
    expect(installationAccepted({ installed: true })).toBe(true);
    for (const flag of ["trackMode", "suspicious", "cspBlocked", "cspFrameBlocked", "idMismatch", "consentBlocked", "conditionalInstall"]) expect(installationAccepted({ installed: true, [flag]: true })).toBe(false);
    expect(installationAccepted({ installed: false })).toBe(false);
  });
  it("uses seven and thirty UTC calendar days", () => {
    expect(utcWindowStart(7, new Date("2026-11-18T05:03:00Z"))).toBe("2026-11-12");
    expect(utcWindowStart(30, new Date("2026-11-18T05:03:00Z"))).toBe("2026-10-20");
  });
  it("distinguishes received from delivered traffic and calculates CTR", () => {
    expect(trafficJson({ impressions_received: 200, clicks_received: 10, impressions_given: 400, clicks_given: 12 })).toEqual({ impressions_received: 200, clicks_received: 10, impressions_delivered: 400, clicks_delivered: 12, ctr_percent: 5 });
  });
  it("does not treat unconfirmed activity as removed", () => {
    expect(startupHealth({ banned: false, status: "approved", membership_mode: "widget", supporter_until: null, widget_last_heartbeat_at: null, widget_currently_visible: null, iframe_blocked: null })).toContain("does not prove it is removed");
  });
});