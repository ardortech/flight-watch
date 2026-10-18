import { CURRENCY_SYMBOL, WHOLE_UNIT_CURRENCIES, type Currency } from "./options";

/**
 * "12月18日" (zh-TW) or "Dec 18" (en). Built by hand for Chinese because Intl gives "12/18" there.
 * Dates are calendar dates, so English formats in UTC.
 */
export function formatShortDate(isoDate: string, locale: string): string {
  if (locale === "zh-TW") {
    const [, m, d] = isoDate.split("-").map(Number);
    return `${m}月${d}日`;
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${isoDate}T00:00:00Z`));
}

/** Nights between two YYYY-MM-DD dates. */
export function nightsBetween(departDate: string, returnDate: string): number {
  return Math.round((Date.parse(`${returnDate}T00:00:00Z`) - Date.parse(`${departDate}T00:00:00Z`)) / 86_400_000);
}

/** "SFO ⇄ TPE" for round trips, "SFO → TPE" for one way. */
export function routeLabel(origin: string, destination: string, tripType: "round" | "oneway"): string {
  return `${origin} ${tripType === "round" ? "⇄" : "→"} ${destination}`;
}

/** "US$1,146", "NT$25,000", "¥98,000". */
export function formatMoney(amount: number, currency: Currency): string {
  const whole = WHOLE_UNIT_CURRENCIES.includes(currency) || Number.isInteger(amount);
  const n = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
  return `${CURRENCY_SYMBOL[currency]}${n}`;
}
