import { formatShortDate, nightsBetween, routeLabel } from "./format";
import type { AirlinePref, Cabin, TripType } from "@/lib/providers/types";

/** A next-intl translator scoped to the "Watch" namespace. */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

export type AirportName = { iata: string; city_en: string; city_zh: string | null; name_en: string; name_zh: string | null };

export function airportCity(a: AirportName | undefined, locale: string): string {
  if (!a) return "";
  return locale === "zh-TW" ? (a.city_zh ?? a.city_en) : a.city_en;
}

export function airportName(a: AirportName, locale: string): string {
  return locale === "zh-TW" ? (a.name_zh ?? a.name_en) : a.name_en;
}

type Describable = {
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
  flex_days: number;
};

/** Text for a watch card / detail header, matching the mockup copy. */
export function describeWatch(
  w: Describable,
  airports: { get(iata: string): AirportName | undefined },
  locale: string,
  t: Translate,
) {
  const round = w.trip_type === "round" && w.return_date;
  const nights = round ? nightsBetween(w.depart_date, w.return_date!) : 0;
  const depart = formatShortDate(w.depart_date, locale);
  const airline = w.airline_pref === "specific" ? w.airlines.join(", ") : t(`airlinePref.${w.airline_pref}`);
  const stops = w.max_stops === null ? null : t(`stopsChip.${w.max_stops}`);

  return {
    route: routeLabel(w.origin, w.destination, w.trip_type),
    cities: t("cities", {
      from: airportCity(airports.get(w.origin), locale) || w.origin,
      to: airportCity(airports.get(w.destination), locale) || w.destination,
    }),
    /** "12月18日 → 1月3日" or "11月26日" */
    dateRange: round ? `${depart} → ${formatShortDate(w.return_date!, locale)}` : depart,
    /** "12月18日 → 1月3日 · 16 晚" or "11月26日 · 單程" */
    dates: round
      ? `${depart} → ${formatShortDate(w.return_date!, locale)} · ${t("nights", { count: nights })}`
      : `${depart} · ${t("oneWayLower")}`,
    /** "來回 · 16 晚" or "單程" */
    tripChip: round ? `${t("tripType.round")} · ${t("nights", { count: nights })}` : t("tripType.oneway"),
    cabinChip: `${t(`cabin.${w.cabin}`)} · ${t("adults", { count: w.adults })}`,
    airline,
    stops,
    /** "經濟艙 · 星空聯盟 · 最多轉機 1 次" */
    filters: [t(`cabin.${w.cabin}`), airline, stops].filter(Boolean).join(" · "),
    window: t(`window.${w.flex_days}`),
    /** "來回 · 1 位成人" */
    priceNote: `${round ? t("roundTripLower") : t("oneWayLower")} · ${t("adults", { count: w.adults })}`,
  };
}
