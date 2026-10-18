import { MockProvider } from "./mock";
import type { InsightProvider, PriceProvider } from "./types";

export type * from "./types";

/** Selected by PRICE_PROVIDER (mock | ignav). Defaults to mock. Ignav arrives in phase 3. */
export function getPriceProvider(): PriceProvider {
  const name = process.env.PRICE_PROVIDER || "mock";
  switch (name) {
    case "mock":
      return new MockProvider();
    default:
      throw new Error(`PRICE_PROVIDER "${name}" is not available yet (phase 1 supports: mock)`);
  }
}

/** SerpApi insights arrive in phase 4; until then the mock serves insights. */
export function getInsightProvider(): InsightProvider {
  return new MockProvider();
}
