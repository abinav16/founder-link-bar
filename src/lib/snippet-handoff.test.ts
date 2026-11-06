import { describe, expect, it } from "vitest";
import { snippetRecipient } from "./snippet-handoff";

describe("snippet email recipient", () => {
  it("uses the signed-in account email without requiring another email", () => {
    expect(snippetRecipient("founder@example.com", "different@example.com")).toBe("founder@example.com");
  });
  it("uses the guest's entered email when signed out", () => {
    expect(snippetRecipient(null, " guest@example.com ")).toBe("guest@example.com");
  });
});