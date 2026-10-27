import { describe, expect, it } from "vitest";
import { resolveWidgetPalette, widgetContrast, widgetMutedColor } from "./widget-palette";

describe("host widget palette", () => {
  it("preserves readable host background and foreground colors", () => {
    expect(resolveWidgetPalette("#e8f7ef", "#123d2b")).toEqual({ background: "#e8f7ef", foreground: "#123d2b" });
  });
  it("corrects unreadable text to at least 4.5:1 contrast", () => {
    for (const background of ["#222222", "#ffffff", "#777777", "#f6be00", "#10392a"]) {
      const palette = resolveWidgetPalette(background, background);
      expect(palette).toBeDefined();
      if (!palette) throw new Error("Missing palette");
      expect(widgetContrast(background, palette.foreground)).toBeGreaterThanOrEqual(4.5);
      expect(widgetContrast(background, widgetMutedColor(palette))).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("rejects CSS expressions and malformed background messages", () => {
    for (const value of ["url(https://example.com)", "red;display:none", "#fff", {}, null]) {
      expect(resolveWidgetPalette(value, "#000000")).toBeUndefined();
    }
  });
});