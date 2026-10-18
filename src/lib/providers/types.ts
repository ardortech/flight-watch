// Provider layer (SPEC §4). Kept source-agnostic so award/mileage providers can be added later.

export type TripType = "round" | "oneway";
export type Cabin = "economy" | "premium_economy" | "business" | "first";
export type AirlinePref = "any" | "star" | "oneworld" | "skyteam" | "specific";
/** "mock" marks fake prices from MockProvider; drop detection only ever compares "ignav" with "ignav". */
export type PriceSource = "ignav" | "serpapi" | "mock";

export type FareQuery = {
  tripType: TripType;
  origin: string;
  destination: string;
  departDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  cabin: Cabin;
  adults: number;
  airlinePref: AirlinePref;
  airlines: string[]; // resolved carrier codes
  maxStops: number | null;
  currency: string;
};

export type FareResult = {
  source: PriceSource;
  price: number | null;
  currency: string | null;
  airline?: string;
  flightNumbers?: string;
  stops?: number;
  providerRef?: string;
  observedAt?: string;
  raw: unknown;
};

export type PriceLevel = "low" | "typical" | "high";

export type Insights = {
  lowestPrice: number | null;
  priceLevel: PriceLevel | null;
  typicalLow: number | null;
  typicalHigh: number | null;
  history: [number, number][]; // [unix_ts, price]
  currency: string;
};

export interface PriceProvider {
  searchLowest(q: FareQuery): Promise<FareResult>;
}

export interface InsightProvider {
  getInsights(q: FareQuery): Promise<Insights>;
}
