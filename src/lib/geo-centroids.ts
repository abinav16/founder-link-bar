// Approximate [lat, lng] centroids for common ISO-3166-1 alpha-2 country codes.
// Used for placing live visitor pins on the map. Not intended to be exhaustive
// — unknown codes fall back to no pin.
export const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  US: [39.8, -98.6], CA: [56.1, -106.3], MX: [23.6, -102.6], BR: [-14.2, -51.9],
  AR: [-38.4, -63.6], CL: [-35.7, -71.5], CO: [4.6, -74.3], PE: [-9.2, -75.0],
  GB: [55.4, -3.4], IE: [53.1, -7.7], FR: [46.2, 2.2], DE: [51.2, 10.5],
  ES: [40.5, -3.7], PT: [39.4, -8.2], IT: [41.9, 12.6], NL: [52.1, 5.3],
  BE: [50.5, 4.5], CH: [46.8, 8.2], AT: [47.5, 14.6], SE: [60.1, 18.6],
  NO: [60.5, 8.5], DK: [56.3, 9.5], FI: [61.9, 25.7], PL: [51.9, 19.1],
  CZ: [49.8, 15.5], RO: [45.9, 24.9], HU: [47.2, 19.5], GR: [39.1, 21.8],
  TR: [38.9, 35.2], RU: [61.5, 105.3], UA: [48.4, 31.2],
  CN: [35.9, 104.2], JP: [36.2, 138.3], KR: [35.9, 127.8], IN: [20.6, 78.9],
  ID: [-0.8, 113.9], TH: [15.9, 100.9], VN: [14.1, 108.3], PH: [12.9, 121.8],
  MY: [4.2, 101.9], SG: [1.4, 103.8], AU: [-25.3, 133.8], NZ: [-40.9, 174.9],
  ZA: [-30.6, 22.9], EG: [26.8, 30.8], NG: [9.1, 8.7], KE: [-0.02, 37.9],
  AE: [23.4, 53.8], SA: [23.9, 45.1], IL: [31.0, 34.9], PK: [30.4, 69.3],
  BD: [23.7, 90.4], TW: [23.7, 121.0], HK: [22.3, 114.2],
};

export const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", CA: "Canada", MX: "Mexico", BR: "Brazil",
  AR: "Argentina", CL: "Chile", CO: "Colombia", PE: "Peru",
  GB: "United Kingdom", IE: "Ireland", FR: "France", DE: "Germany",
  ES: "Spain", PT: "Portugal", IT: "Italy", NL: "Netherlands",
  BE: "Belgium", CH: "Switzerland", AT: "Austria", SE: "Sweden",
  NO: "Norway", DK: "Denmark", FI: "Finland", PL: "Poland",
  CZ: "Czechia", RO: "Romania", HU: "Hungary", GR: "Greece",
  TR: "Turkey", RU: "Russia", UA: "Ukraine",
  CN: "China", JP: "Japan", KR: "South Korea", IN: "India",
  ID: "Indonesia", TH: "Thailand", VN: "Vietnam", PH: "Philippines",
  MY: "Malaysia", SG: "Singapore", AU: "Australia", NZ: "New Zealand",
  ZA: "South Africa", EG: "Egypt", NG: "Nigeria", KE: "Kenya",
  AE: "UAE", SA: "Saudi Arabia", IL: "Israel", PK: "Pakistan",
  BD: "Bangladesh", TW: "Taiwan", HK: "Hong Kong",
};

export function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + code.toUpperCase().charCodeAt(0) - 65,
    A + code.toUpperCase().charCodeAt(1) - 65,
  );
}

/** Jitter a coordinate by up to +/- `range` degrees so overlapping pins spread out. */
export function jitter(value: number, range: number): number {
  return value + (Math.random() - 0.5) * range * 2;
}

/**
 * Land anchor points (major population centres) per country. Pins are placed on
 * one of these instead of a country centroid + wide random jitter, which used to
 * drop visitors into the sea (e.g. UK pins landing in the North Sea).
 */
export const COUNTRY_LAND_POINTS: Record<string, [number, number][]> = {
  US: [[40.71, -74.01], [34.05, -118.24], [41.88, -87.63], [29.76, -95.37], [33.75, -84.39], [47.61, -122.33], [39.74, -104.99], [25.76, -80.19]],
  CA: [[43.65, -79.38], [45.50, -73.57], [49.28, -123.12], [51.05, -114.07], [45.42, -75.70]],
  MX: [[19.43, -99.13], [20.66, -103.35], [25.69, -100.32]],
  BR: [[-23.55, -46.63], [-22.91, -43.17], [-15.79, -47.88], [-30.03, -51.23]],
  AR: [[-34.60, -58.38], [-31.42, -64.18]], CL: [[-33.45, -70.67]], CO: [[4.71, -74.07], [6.24, -75.58]], PE: [[-12.05, -77.04]],
  GB: [[51.51, -0.13], [53.48, -2.24], [52.49, -1.89], [55.86, -4.25], [53.80, -1.55], [51.45, -2.59], [54.97, -1.61]],
  IE: [[53.35, -6.26], [51.90, -8.47]],
  FR: [[48.86, 2.35], [45.76, 4.84], [43.30, 5.37], [43.60, 1.44]],
  DE: [[52.52, 13.40], [48.14, 11.58], [50.11, 8.68], [53.55, 9.99], [50.94, 6.96]],
  ES: [[40.42, -3.70], [41.39, 2.17], [37.39, -5.98], [39.47, -0.38]],
  PT: [[38.72, -9.14], [41.15, -8.61]],
  IT: [[41.90, 12.50], [45.46, 9.19], [40.85, 14.27], [45.07, 7.69]],
  NL: [[52.37, 4.90], [51.92, 4.48], [52.09, 5.12]],
  BE: [[50.85, 4.35], [51.22, 4.40]], CH: [[47.38, 8.54], [46.20, 6.14]], AT: [[48.21, 16.37], [47.07, 15.44]],
  SE: [[59.33, 18.07], [57.71, 11.97]], NO: [[59.91, 10.75], [60.39, 5.32]], DK: [[55.68, 12.57], [56.16, 10.20]],
  FI: [[60.17, 24.94], [61.50, 23.77]], PL: [[52.23, 21.01], [50.06, 19.94], [51.11, 17.04]],
  CZ: [[50.08, 14.44], [49.20, 16.61]], RO: [[44.43, 26.10], [46.77, 23.60]], HU: [[47.50, 19.04]],
  GR: [[37.98, 23.73], [40.64, 22.94]], TR: [[41.01, 28.98], [39.93, 32.86], [38.42, 27.14]],
  RU: [[55.76, 37.62], [59.93, 30.34], [55.03, 82.92], [56.84, 60.61]],
  UA: [[50.45, 30.52], [49.84, 24.03]],
  CN: [[39.90, 116.41], [31.23, 121.47], [23.13, 113.26], [22.54, 114.06], [30.57, 104.07]],
  JP: [[35.68, 139.69], [34.69, 135.50], [35.18, 136.91], [43.06, 141.35]],
  KR: [[37.57, 126.98], [35.18, 129.08]],
  IN: [[28.61, 77.21], [19.08, 72.88], [12.97, 77.59], [17.39, 78.49], [13.08, 80.27], [22.57, 88.36], [23.02, 72.57], [18.52, 73.86], [26.91, 75.79], [11.02, 76.96]],
  ID: [[-6.21, 106.85], [-7.25, 112.75], [-6.92, 107.61]],
  TH: [[13.76, 100.50], [18.79, 98.99]], VN: [[21.03, 105.85], [10.82, 106.63]],
  PH: [[14.60, 120.98], [10.32, 123.89]], MY: [[3.14, 101.69], [5.41, 100.34]], SG: [[1.35, 103.82]],
  AU: [[-33.87, 151.21], [-37.81, 144.96], [-27.47, 153.03], [-31.95, 115.86]],
  NZ: [[-36.85, 174.76], [-41.29, 174.78]],
  ZA: [[-26.20, 28.05], [-33.92, 18.42], [-29.86, 31.02]],
  EG: [[30.04, 31.24], [31.20, 29.92]], NG: [[6.52, 3.38], [9.06, 7.49]], KE: [[-1.29, 36.82]],
  AE: [[25.20, 55.27], [24.45, 54.38]], SA: [[24.71, 46.68], [21.49, 39.19]], IL: [[32.08, 34.78], [31.77, 35.21]],
  PK: [[24.86, 67.01], [31.55, 74.34], [33.68, 73.05]],
  BD: [[23.81, 90.41], [22.36, 91.78]], TW: [[25.03, 121.57], [22.63, 120.30]], HK: [[22.32, 114.17]],
};

/** Deterministic 32-bit hash so the same visitor id always maps to the same spot. */
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Stable, land-anchored [lat, lng] for a visitor pin. Same id → same position
 * on every refresh, and always near a real city rather than in the ocean.
 */
export function pinPosition(country: string, seed: string): [number, number] | null {
  const points = COUNTRY_LAND_POINTS[country];
  const base = points && points.length > 0
    ? points[hashSeed(seed) % points.length]!
    : COUNTRY_CENTROIDS[country];
  if (!base) return null;
  const h = hashSeed(`${seed}:offset`);
  // Tiny deterministic spread (~±0.25°, roughly 25 km) so co-located pins don't stack.
  const dLat = (((h & 0xffff) / 0xffff) - 0.5) * 0.5;
  const dLng = ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * 0.5;
  return [base[0] + dLat, base[1] + dLng];
}
