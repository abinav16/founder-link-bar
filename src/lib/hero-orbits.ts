/** Assign every startup exactly one permanent position, without a logo limit. */
export function assignHeroOrbits(count: number, ringCount = 4) {
  return Array.from({ length: count }, (_, index) => {
    const ring = index % ringCount;
    const position = Math.floor(index / ringCount);
    const population = Math.ceil((count - ring) / ringCount);
    return { index, ring, angle: position / population * Math.PI * 2 };
  });
}