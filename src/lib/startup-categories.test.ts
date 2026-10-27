import { describe, expect, test } from "vitest";
import { STARTUP_CATEGORIES, isStartupCategory, matchesStartupCategory } from "./startup-categories";

describe("startup categories", () => {
  test("accepts each supported category and rejects arbitrary input", () => {
    expect(STARTUP_CATEGORIES.every(isStartupCategory)).toBe(true);
    expect(isStartupCategory("made-up" )).toBe(false);
    expect(isStartupCategory("")).toBe(false);
    expect(isStartupCategory(null)).toBe(false);
  });
  test("category filtering includes only matching listings", () => {
    expect(matchesStartupCategory("AI", "AI")).toBe(true);
    expect(matchesStartupCategory("Finance", "AI")).toBe(false);
    expect(matchesStartupCategory(null, "AI")).toBe(false);
  });
  test("legacy listings stay discoverable without an invented category", () => {
    expect(matchesStartupCategory(null, "all")).toBe(true);
    expect(matchesStartupCategory(null, "uncategorized")).toBe(true);
    expect(matchesStartupCategory("AI", "uncategorized")).toBe(false);
  });
});