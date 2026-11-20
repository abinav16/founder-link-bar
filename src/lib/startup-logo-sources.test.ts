import { describe, expect, it } from "vitest";
import { startupLogoSources } from "./startup-logo-sources";

describe("startup logo attempts", () => {
  it("does not retry the same Google fallback", () => {
    const favicon = "https://www.google.com/s2/favicons?domain=example.com&sz=128";
    expect(startupLogoSources("https://www.example.com/page", favicon)).toEqual([favicon]);
  });
  it("tries an uploaded logo before a single favicon fallback", () => {
    expect(startupLogoSources("example.com", "https://cdn.example.com/logo.png")).toEqual([
      "https://cdn.example.com/logo.png",
      "https://www.google.com/s2/favicons?domain=example.com&sz=128",
    ]);
  });
  it("does not request a favicon for an empty or invalid website", () => {
    expect(startupLogoSources("")).toEqual([]);
    expect(startupLogoSources("not a domain", "https://cdn.example.com/logo.png")).toEqual(["https://cdn.example.com/logo.png"]);
  });
});