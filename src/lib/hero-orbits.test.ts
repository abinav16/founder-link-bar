import { describe, expect, it } from "vitest";
import { assignHeroOrbits } from "./hero-orbits";

describe("approved startup orbits", () => {
  it("retains every startup even when there are more than 100", () => {
    const slots = assignHeroOrbits(137);
    expect(slots).toHaveLength(137);
    expect(new Set(slots.map(slot => slot.index)).size).toBe(137);
    expect(slots.map(slot => slot.index)).toEqual(Array.from({ length: 137 }, (_, i) => i));
  });
  it("gives each startup a unique stable location on its ring", () => {
    const slots = assignHeroOrbits(87);
    expect(new Set(slots.map(slot => `${slot.ring}:${slot.angle}`)).size).toBe(87);
    expect(assignHeroOrbits(87)).toEqual(slots);
  });
});