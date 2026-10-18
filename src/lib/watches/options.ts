import type { AirlinePref, Cabin, TripType } from "@/lib/providers/types";

// Allowed values for a watch (SPEC §1, §3). The DB check constraints mirror these.

export const TRIP_TYPES = ["round", "oneway"] as const satisfies readonly TripType[];
export const CABINS = ["economy", "premium_economy", "business", "first"] as const satisfies readonly Cabin[];
export const AIRLINE_PREFS = ["any", "star", "oneworld", "skyteam", "specific"] as const satisfies readonly AirlinePref[];
export const FLEX_DAYS = [0, 3, 7] as const;
export const CHECK_EVERY_HOURS = [6, 12, 24] as const;
/** Form values for max_stops: "any" = null, "0" = nonstop, "1" = at most one stop. */
export const STOPS = ["any", "0", "1"] as const;

export const CURRENCIES = ["USD", "TWD", "JPY", "EUR", "GBP", "HKD", "SGD", "CAD", "AUD", "KRW"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Short symbols shown before amounts, as in the mockups (US$, NT$, ¥ …). */
export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "US$", TWD: "NT$", JPY: "¥", EUR: "€", GBP: "£", HKD: "HK$", SGD: "S$", CAD: "CA$", AUD: "A$", KRW: "₩",
};

/** Currencies priced in whole units (no cents). */
export const WHOLE_UNIT_CURRENCIES: readonly Currency[] = ["TWD", "JPY", "KRW"];

export const DEFAULT_CHECK_EVERY_HOURS = 12;

export type FlexDays = (typeof FLEX_DAYS)[number];
export type CheckEveryHours = (typeof CHECK_EVERY_HOURS)[number];

/** A watch as stored (the columns the app reads). */
export type Watch = {
  id: string;
  trip_type: TripType;
  origin: string;
  destination: string;
  depart_date: string;
  return_date: string | null;
  cabin: Cabin;
  adults: number;
  airline_pref: AirlinePref;
  airlines: string[];
  max_stops: number | null;
  flex_days: FlexDays;
  currency: Currency;
  check_every_hours: CheckEveryHours;
  target_price: number | null;
  status: "active" | "paused";
  deleted_at: string | null;
  created_at: string;
};

export const WATCH_COLUMNS =
  "id, trip_type, origin, destination, depart_date, return_date, cabin, adults, airline_pref, airlines, max_stops, flex_days, currency, check_every_hours, target_price, status, deleted_at, created_at";

/** Number of date pairs checked: your dates plus 2 × flex_days nearby pairs. */
export function datesChecked(flexDays: FlexDays): number {
  return 1 + 2 * flexDays;
}

/**
 * Estimated provider calls per month, shown on the New watch form (formula from the mockup):
 * target dates every `checkEveryHours`, plus each nearby date pair once a day, over 30 days.
 * Real usage is lower when departure is more than 90 days away (SPEC §5); the form says so.
 */
export function estimateChecksPerMonth(flexDays: FlexDays, checkEveryHours: CheckEveryHours): number {
  return (24 / checkEveryHours) * 30 + 2 * flexDays * 30;
}
