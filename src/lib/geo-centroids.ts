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
