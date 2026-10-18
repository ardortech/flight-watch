import type { AirportName } from "./describe";

export type SearchableAirport = AirportName & { country_code: string };

/** Lowercase, strip accents ("Zürich" → "zurich") and use 台 for 臺 so either spelling matches. */
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/臺/g, "台").trim();
}

/**
 * Airports matching what the user typed, best first: exact code, code prefix,
 * city prefix (English or Chinese), then any match inside a city or airport name.
 * Matching inside names waits for 3 letters (any Chinese character counts), so "t" doesn't match "Airport".
 */
export function searchAirports<T extends SearchableAirport>(airports: readonly T[], query: string, limit = 8): T[] {
  const q = normalize(query);
  if (!q) return [];
  const inside = q.length >= 3 || /[^\x00-\x7f]/.test(q);
  const scored: { a: T; score: number }[] = [];
  for (const a of airports) {
    const code = a.iata.toLowerCase();
    const cities = [a.city_en, a.city_zh ?? ""].map(normalize);
    const names = [a.name_en, a.name_zh ?? ""].map(normalize);
    let score: number;
    if (code === q) score = 0;
    else if (code.startsWith(q)) score = 1;
    else if (cities.some((c) => c && c.startsWith(q))) score = 2;
    else if (inside && [...cities, ...names].some((s) => s && s.includes(q))) score = 3;
    else continue;
    scored.push({ a, score });
  }
  scored.sort((x, y) => x.score - y.score || x.a.iata.localeCompare(y.a.iata));
  return scored.slice(0, limit).map((s) => s.a);
}
