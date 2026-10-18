import {
  AIRLINE_PREFS, CABINS, CHECK_EVERY_HOURS, CURRENCIES, FLEX_DAYS, STOPS, TRIP_TYPES, WHOLE_UNIT_CURRENCIES,
  type CheckEveryHours, type Currency, type FlexDays,
} from "./options";
import type { AirlinePref, Cabin, TripType } from "@/lib/providers/types";

/** The columns a user sets on the New / Edit watch form. */
export type WatchInput = {
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
};

export type WatchField =
  | "trip_type" | "origin" | "destination" | "depart_date" | "return_date" | "cabin" | "adults"
  | "airline_pref" | "airlines" | "max_stops" | "flex_days" | "currency" | "check_every_hours" | "target_price";

/** Error codes are message keys under `WatchForm.errors` in messages/*.json. */
export type WatchErrorCode =
  | "required" | "invalid" | "unknownAirport" | "sameAirport" | "datePast" | "returnBeforeDepart"
  | "airlinesRequired" | "airlinesInvalid" | "adultsRange" | "targetInvalid";

export type WatchErrors = Partial<Record<WatchField, WatchErrorCode>>;

export type ValidationResult = { ok: true; value: WatchInput } | { ok: false; errors: WatchErrors };

export type RawWatchForm = Partial<Record<WatchField, string>>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const IATA_RE = /^[A-Z]{3}$/;
const CARRIER_RE = /^[A-Z0-9]{2}$/;
const MAX_AIRLINES = 10;

/** Today's date (YYYY-MM-DD, UTC). Departure must be after this. */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Validates the watch form. Shared by the browser (instant feedback) and the server action (the real check).
 * @param today YYYY-MM-DD; departure must be later than this.
 * @param isKnownAirport whether an IATA code is in the airports table.
 */
export function validateWatch(
  raw: RawWatchForm,
  today: string,
  isKnownAirport: (iata: string) => boolean,
): ValidationResult {
  const errors: WatchErrors = {};
  const s = (k: WatchField) => (raw[k] ?? "").trim();

  const trip_type = pick(s("trip_type"), TRIP_TYPES);
  if (!trip_type) errors.trip_type = "invalid";

  const origin = s("origin").toUpperCase();
  const destination = s("destination").toUpperCase();
  for (const [field, code] of [["origin", origin], ["destination", destination]] as const) {
    if (!code) errors[field] = "required";
    else if (!IATA_RE.test(code) || !isKnownAirport(code)) errors[field] = "unknownAirport";
  }
  if (!errors.origin && !errors.destination && origin === destination) errors.destination = "sameAirport";

  const depart_date = s("depart_date");
  if (!depart_date) errors.depart_date = "required";
  else if (!isValidDate(depart_date)) errors.depart_date = "invalid";
  else if (depart_date <= today) errors.depart_date = "datePast";

  let return_date: string | null = null;
  if (trip_type === "round") {
    return_date = s("return_date");
    if (!return_date) errors.return_date = "required";
    else if (!isValidDate(return_date)) errors.return_date = "invalid";
    else if (!errors.depart_date && return_date <= depart_date) errors.return_date = "returnBeforeDepart";
  }

  const cabin = pick(s("cabin"), CABINS);
  if (!cabin) errors.cabin = "invalid";

  const adultsText = s("adults");
  const adults = Number(adultsText);
  if (!/^\d+$/.test(adultsText) || adults < 1 || adults > 9) errors.adults = "adultsRange";

  const airline_pref = pick(s("airline_pref"), AIRLINE_PREFS);
  if (!airline_pref) errors.airline_pref = "invalid";
  let airlines: string[] = [];
  if (airline_pref === "specific") {
    airlines = [...new Set(s("airlines").toUpperCase().split(/[\s,，、]+/).filter(Boolean))];
    if (airlines.length === 0) errors.airlines = "airlinesRequired";
    else if (airlines.length > MAX_AIRLINES || !airlines.every((c) => CARRIER_RE.test(c))) errors.airlines = "airlinesInvalid";
  }

  const stops = pick(s("max_stops"), STOPS);
  if (!stops) errors.max_stops = "invalid";

  const flex_days = pickNumber(s("flex_days"), FLEX_DAYS);
  if (flex_days === null) errors.flex_days = "invalid";

  const currency = pick(s("currency"), CURRENCIES);
  if (!currency) errors.currency = "invalid";

  const check_every_hours = pickNumber(s("check_every_hours"), CHECK_EVERY_HOURS);
  if (check_every_hours === null) errors.check_every_hours = "invalid";

  let target_price: number | null = null;
  const targetText = s("target_price").replace(/,/g, "");
  if (targetText) {
    const decimals = currency && WHOLE_UNIT_CURRENCIES.includes(currency) ? 0 : 2;
    const re = decimals === 0 ? /^\d+$/ : /^\d+(\.\d{1,2})?$/;
    target_price = Number(targetText);
    if (!re.test(targetText) || target_price <= 0 || target_price >= 1e10) errors.target_price = "targetInvalid";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      trip_type: trip_type!,
      origin,
      destination,
      depart_date,
      return_date,
      cabin: cabin!,
      adults,
      airline_pref: airline_pref!,
      airlines,
      max_stops: stops === "any" ? null : Number(stops),
      flex_days: flex_days!,
      currency: currency!,
      check_every_hours: check_every_hours!,
      target_price,
    },
  };
}

function pick<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function pickNumber<T extends number>(value: string, allowed: readonly T[]): T | null {
  const n = Number(value);
  return value !== "" && (allowed as readonly number[]).includes(n) ? (n as T) : null;
}

function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
