import { describe, expect, it } from "vitest";
import { validateWatch, todayUtc, type RawWatchForm } from "./validate";

const known = new Set(["SFO", "TPE", "NRT"]);
const isKnown = (c: string) => known.has(c);
const TODAY = "2026-10-18";

const valid: RawWatchForm = {
  trip_type: "round",
  origin: "sfo",
  destination: "TPE",
  depart_date: "2026-12-18",
  return_date: "2027-01-03",
  cabin: "economy",
  adults: "1",
  airline_pref: "star",
  airlines: "",
  max_stops: "1",
  flex_days: "7",
  currency: "USD",
  check_every_hours: "12",
  target_price: "800",
};

function errorsFor(patch: RawWatchForm) {
  const r = validateWatch({ ...valid, ...patch }, TODAY, isKnown);
  return r.ok ? {} : r.errors;
}

describe("validateWatch", () => {
  it("accepts a valid round trip and normalizes values", () => {
    const r = validateWatch(valid, TODAY, isKnown);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({
      origin: "SFO", destination: "TPE", return_date: "2027-01-03", adults: 1,
      max_stops: 1, flex_days: 7, check_every_hours: 12, target_price: 800, airlines: [],
    });
  });

  it("drops the return date for one-way trips", () => {
    const r = validateWatch({ ...valid, trip_type: "oneway", return_date: "garbage" }, TODAY, isKnown);
    expect(r.ok && r.value.return_date).toBe(null);
  });

  it("requires a return date after the departure date", () => {
    expect(errorsFor({ return_date: "" }).return_date).toBe("required");
    expect(errorsFor({ return_date: "2026-12-18" }).return_date).toBe("returnBeforeDepart");
    expect(errorsFor({ return_date: "2026-12-01" }).return_date).toBe("returnBeforeDepart");
  });

  it("requires a departure date in the future", () => {
    expect(errorsFor({ depart_date: TODAY }).depart_date).toBe("datePast");
    expect(errorsFor({ depart_date: "2026-01-01" }).depart_date).toBe("datePast");
    expect(errorsFor({ depart_date: "2026-10-19" }).depart_date).toBeUndefined();
  });

  it("rejects impossible dates", () => {
    expect(errorsFor({ depart_date: "2026-02-30" }).depart_date).toBe("invalid");
    expect(errorsFor({ depart_date: "12/18/2026" }).depart_date).toBe("invalid");
  });

  it("requires known IATA codes and different airports", () => {
    expect(errorsFor({ origin: "" }).origin).toBe("required");
    expect(errorsFor({ origin: "XXX" }).origin).toBe("unknownAirport");
    expect(errorsFor({ origin: "SF" }).origin).toBe("unknownAirport");
    expect(errorsFor({ origin: "SFO · San Francisco" }).origin).toBe("unknownAirport");
    expect(errorsFor({ destination: "SFO" }).destination).toBe("sameAirport");
  });

  it("requires valid carrier codes for specific airlines", () => {
    expect(errorsFor({ airline_pref: "specific", airlines: "" }).airlines).toBe("airlinesRequired");
    expect(errorsFor({ airline_pref: "specific", airlines: "BR, EVA" }).airlines).toBe("airlinesInvalid");
    const r = validateWatch({ ...valid, airline_pref: "specific", airlines: "br, ci、BR 3u" }, TODAY, isKnown);
    expect(r.ok && r.value.airlines).toEqual(["BR", "CI", "3U"]);
  });

  it("ignores airline codes unless the preference is specific", () => {
    const r = validateWatch({ ...valid, airline_pref: "any", airlines: "BR" }, TODAY, isKnown);
    expect(r.ok && r.value.airlines).toEqual([]);
  });

  it("checks adults, stops, window, frequency and currency against allowed values", () => {
    expect(errorsFor({ adults: "0" }).adults).toBe("adultsRange");
    expect(errorsFor({ adults: "10" }).adults).toBe("adultsRange");
    expect(errorsFor({ adults: "1.5" }).adults).toBe("adultsRange");
    expect(errorsFor({ max_stops: "2" }).max_stops).toBe("invalid");
    expect(errorsFor({ flex_days: "5" }).flex_days).toBe("invalid");
    expect(errorsFor({ check_every_hours: "1" }).check_every_hours).toBe("invalid");
    expect(errorsFor({ currency: "CNY" }).currency).toBe("invalid");
    expect(errorsFor({ cabin: "premium" }).cabin).toBe("invalid");
  });

  it("maps 'any' stops to null", () => {
    const r = validateWatch({ ...valid, max_stops: "any" }, TODAY, isKnown);
    expect(r.ok && r.value.max_stops).toBe(null);
  });

  it("treats the target price as optional and checks its format", () => {
    const r = validateWatch({ ...valid, target_price: "" }, TODAY, isKnown);
    expect(r.ok && r.value.target_price).toBe(null);
    expect(errorsFor({ target_price: "0" }).target_price).toBe("targetInvalid");
    expect(errorsFor({ target_price: "-5" }).target_price).toBe("targetInvalid");
    expect(errorsFor({ target_price: "12.345" }).target_price).toBe("targetInvalid");
    expect(errorsFor({ target_price: "799.50" }).target_price).toBeUndefined();
    expect(errorsFor({ target_price: "1,200" }).target_price).toBeUndefined();
    expect(errorsFor({ currency: "TWD", target_price: "25000.5" }).target_price).toBe("targetInvalid");
  });
});

describe("todayUtc", () => {
  it("formats the UTC date", () => {
    expect(todayUtc(new Date("2026-10-18T23:30:00-08:00"))).toBe("2026-10-19");
  });
});
