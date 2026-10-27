import { describe, expect, it } from "vitest";
import { extractSiteColors } from "./preview-probe.server";

describe("preview site palette", () => {
  it("reads Notepad+ background and text from external CSS variables", () => {
    expect(extractSiteColors("<html><body></body></html>", ":root{--background:80 10% 96%;--foreground:150 10% 12%}body{background-color:hsl(var(--background));color:hsl(var(--foreground))}")).toEqual({ bg: "#f5f6f4", fg: "#1c221f" });
  });
  it("prefers page colors over browser theme metadata", () => {
    expect(extractSiteColors('<meta name="theme-color" content="#ffffff">', 'body{background:#e8f7ef;color:#123d2b}')).toEqual({ bg: "#e8f7ef", fg: "#123d2b" });
  });
  it("keeps inactive dark theme variables out of light previews", () => {
    expect(extractSiteColors("", ':root{--background:80 10% 96%}.dark{--background:0 0% 0%}body{background:hsl(var(--background))}').bg).toBe("#f5f6f4");
  });
});