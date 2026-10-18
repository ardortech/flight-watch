import { describe, expect, it } from "vitest";
import { searchAirports, type SearchableAirport } from "./airport-search";

const a = (iata: string, city_en: string, city_zh: string, name_en: string, name_zh: string): SearchableAirport => ({
  iata, city_en, city_zh, name_en, name_zh, country_code: "XX",
});

const airports = [
  a("TPE", "Taipei", "台北", "Taiwan Taoyuan International Airport", "桃園國際機場"),
  a("TSA", "Taipei", "台北", "Taipei Songshan International Airport", "台北松山機場"),
  a("ZRH", "Zurich", "蘇黎世", "Zürich Airport", "蘇黎世機場"),
  a("SFO", "San Francisco", "舊金山", "San Francisco International Airport", "舊金山國際機場"),
  a("TAE", "Daegu", "大邱", "Daegu International Airport", "大邱國際機場"),
];

const codes = (q: string) => searchAirports(airports, q).map((x) => x.iata);

describe("searchAirports", () => {
  it("puts an exact code first, then code prefixes", () => {
    expect(codes("tpe")[0]).toBe("TPE");
    expect(codes("T")).toEqual(["TAE", "TPE", "TSA"]);
  });

  it("matches English and Chinese city names", () => {
    expect(codes("taipei")).toEqual(["TPE", "TSA"]);
    expect(codes("台北")).toEqual(["TPE", "TSA"]);
    expect(codes("舊金山")).toEqual(["SFO"]);
  });

  it("treats 臺 and 台 the same", () => {
    expect(codes("臺北")).toEqual(["TPE", "TSA"]);
  });

  it("matches inside airport names and ignores accents", () => {
    expect(codes("桃園")).toEqual(["TPE"]);
    expect(codes("zürich")).toEqual(["ZRH"]);
    expect(codes("songshan")).toEqual(["TSA"]);
  });

  it("returns nothing for an empty query", () => {
    expect(codes("  ")).toEqual([]);
  });
});
