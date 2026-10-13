import type { FareQuery, FareResult, InsightProvider, Insights, PriceProvider } from "./types";

/**
 * Deterministic fake prices for development and tests. The same query always
 * returns the same price, so nothing is billed while building the app.
 * Results are reported as source "ignav" because the mock stands in for Ignav.
 */
export class MockProvider implements PriceProvider, InsightProvider {
  async searchLowest(q: FareQuery): Promise<FareResult> {
    const price = mockPrice(q);
    const airline = MOCK_CARRIERS[hash(`${q.origin}${q.destination}`) % MOCK_CARRIERS.length];
    return {
      source: "ignav",
      price,
      currency: q.currency,
      airline,
      flightNumbers: `${airline}${100 + (hash(queryKey(q)) % 900)}`,
      stops: q.maxStops === 0 ? 0 : hash(queryKey(q) + "stops") % 2,
      providerRef: `mock_${hash(queryKey(q)).toString(36)}`,
      observedAt: undefined,
      raw: { mock: true },
    };
  }

  async getInsights(q: FareQuery): Promise<Insights> {
    const price = mockPrice(q);
    const level = (["low", "typical", "high"] as const)[hash(queryKey(q) + "level") % 3];
    // Place the typical range so the price falls below / inside / above it.
    const center = level === "low" ? price * 1.25 : level === "high" ? price * 0.75 : price;
    const typicalLow = round2(center * 0.9);
    const typicalHigh = round2(center * 1.1);
    return {
      lowestPrice: price,
      priceLevel: level,
      typicalLow,
      typicalHigh,
      history: [],
      currency: q.currency,
    };
  }
}

const MOCK_CARRIERS = ["BR", "CI", "JL", "NH", "UA", "CX"];

/** Rough USD per unit of each supported currency, so mock prices look plausible. */
const USD_RATE: Record<string, number> = {
  USD: 1, TWD: 32, JPY: 150, EUR: 0.92, GBP: 0.79, HKD: 7.8, SGD: 1.35, CAD: 1.37, AUD: 1.52, KRW: 1380,
};

const CABIN_FACTOR: Record<FareQuery["cabin"], number> = {
  economy: 1, premium_economy: 1.8, business: 4, first: 7,
};

export function mockPrice(q: FareQuery): number {
  const base = 300 + (hash(`${q.origin}-${q.destination}`) % 900); // route base, USD
  const dayNoise = (hash(queryKey(q)) % 200) - 100; // ±100 by dates/filters
  const tripFactor = q.tripType === "round" ? 1 : 0.6;
  const usd = Math.max(80, (base + dayNoise) * tripFactor * CABIN_FACTOR[q.cabin]) * q.adults;
  const rate = USD_RATE[q.currency] ?? 1;
  // Whole units for currencies without minor units in practice.
  return q.currency === "JPY" || q.currency === "KRW" || q.currency === "TWD"
    ? Math.round(usd * rate)
    : round2(usd * rate);
}

function queryKey(q: FareQuery): string {
  return [
    q.tripType, q.origin, q.destination, q.departDate, q.returnDate ?? "",
    q.cabin, q.adults, q.airlinePref, [...q.airlines].sort().join(","), q.maxStops ?? "any",
  ].join("|");
}

/** FNV-1a 32-bit. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
