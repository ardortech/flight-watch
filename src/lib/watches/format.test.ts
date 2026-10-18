import { describe, expect, it } from "vitest";
import { formatMoney, formatShortDate, nightsBetween, routeLabel } from "./format";
import { estimateChecksPerMonth, datesChecked } from "./options";

describe("formatShortDate", () => {
  it("uses Taiwan style in Chinese and short months in English", () => {
    expect(formatShortDate("2026-12-18", "zh-TW")).toBe("12月18日");
    expect(formatShortDate("2027-01-03", "en")).toBe("Jan 3");
  });
});

describe("nightsBetween", () => {
  it("counts nights across a year boundary", () => {
    expect(nightsBetween("2026-12-18", "2027-01-03")).toBe(16);
  });
});

describe("routeLabel", () => {
  it("uses ⇄ for round trips and → for one way", () => {
    expect(routeLabel("SFO", "TPE", "round")).toBe("SFO ⇄ TPE");
    expect(routeLabel("SFO", "JFK", "oneway")).toBe("SFO → JFK");
  });
});

describe("formatMoney", () => {
  it("formats with the currency symbol", () => {
    expect(formatMoney(1146, "USD")).toBe("US$1,146");
    expect(formatMoney(799.5, "USD")).toBe("US$799.50");
    expect(formatMoney(25000, "TWD")).toBe("NT$25,000");
  });
});

describe("estimateChecksPerMonth", () => {
  it("matches SPEC §5 volumes at the 12h default", () => {
    expect(estimateChecksPerMonth(0, 12)).toBe(60);
    expect(estimateChecksPerMonth(3, 12)).toBe(240);
    expect(estimateChecksPerMonth(7, 12)).toBe(480);
  });

  it("scales the target-date checks with the frequency", () => {
    expect(estimateChecksPerMonth(0, 6)).toBe(120);
    expect(estimateChecksPerMonth(0, 24)).toBe(30);
  });

  it("counts 1 / 7 / 15 dates", () => {
    expect([0, 3, 7].map((d) => datesChecked(d as 0 | 3 | 7))).toEqual([1, 7, 15]);
  });
});
