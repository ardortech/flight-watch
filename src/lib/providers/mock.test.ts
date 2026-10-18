import { describe, expect, it } from "vitest";
import { MockProvider, mockPrice } from "./mock";
import type { FareQuery } from "./types";

const base: FareQuery = {
  tripType: "round",
  origin: "SFO",
  destination: "TPE",
  departDate: "2026-12-15",
  returnDate: "2026-12-29",
  cabin: "economy",
  adults: 1,
  airlinePref: "any",
  airlines: [],
  maxStops: null,
  currency: "USD",
};

describe("MockProvider", () => {
  it("returns the same price for the same query", async () => {
    const p = new MockProvider();
    const a = await p.searchLowest(base);
    const b = await p.searchLowest({ ...base });
    expect(a.price).toBe(b.price);
    expect(a.providerRef).toBe(b.providerRef);
  });

  it("varies price by date", () => {
    const prices = new Set(
      ["2026-12-12", "2026-12-13", "2026-12-14", "2026-12-15", "2026-12-16"].map((d) =>
        mockPrice({ ...base, departDate: d }),
      ),
    );
    expect(prices.size).toBeGreaterThan(1);
  });

  it("ignores airline order", () => {
    expect(mockPrice({ ...base, airlinePref: "specific", airlines: ["BR", "CI"] })).toBe(
      mockPrice({ ...base, airlinePref: "specific", airlines: ["CI", "BR"] }),
    );
  });

  it("prices premium cabins and more adults higher", () => {
    expect(mockPrice({ ...base, cabin: "business" })).toBeGreaterThan(mockPrice(base));
    expect(mockPrice({ ...base, adults: 2 })).toBeGreaterThan(mockPrice(base));
  });

  it("returns the requested currency, in whole units for TWD", async () => {
    const r = await new MockProvider().searchLowest({ ...base, currency: "TWD" });
    expect(r.currency).toBe("TWD");
    expect(Number.isInteger(r.price)).toBe(true);
  });

  it("labels its results as mock, never ignav", async () => {
    const r = await new MockProvider().searchLowest(base);
    expect(r.source).toBe("mock");
  });

  it("respects nonstop-only", async () => {
    const r = await new MockProvider().searchLowest({ ...base, maxStops: 0 });
    expect(r.stops).toBe(0);
  });
});

describe("MockProvider insights", () => {
  it("puts the price on the correct side of the typical range", async () => {
    const p = new MockProvider();
    for (const d of ["2026-12-10", "2026-12-11", "2026-12-12", "2026-12-13", "2026-12-14", "2026-12-15"]) {
      const i = await p.getInsights({ ...base, departDate: d });
      const price = i.lowestPrice!;
      if (i.priceLevel === "low") expect(price).toBeLessThan(i.typicalLow!);
      if (i.priceLevel === "high") expect(price).toBeGreaterThan(i.typicalHigh!);
      if (i.priceLevel === "typical") {
        expect(price).toBeGreaterThanOrEqual(i.typicalLow!);
        expect(price).toBeLessThanOrEqual(i.typicalHigh!);
      }
    }
  });
});
