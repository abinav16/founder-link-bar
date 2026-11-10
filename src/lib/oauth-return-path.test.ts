import { describe, expect, it } from "vitest";
import { oauthReturnPath } from "./oauth-return-path";

describe("OAuth return boundary", () => {
  it("preserves the authorization request and fragment", () => {
    expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=123#account")).toBe("/.lovable/oauth/consent?authorization_id=123#account");
  });
  it("rejects external redirects, network paths, backslashes and control characters", () => {
    for (const value of ["https://outside.invalid", "//outside.invalid", "/\\outside.invalid", "/auth\n", null]) expect(oauthReturnPath(value)).toBe("/");
  });
});