import { describe, expect, it } from "vitest";
import { magicLinkCleanup } from "./magic-link";

const cleanup = (path: string) => magicLinkCleanup(new URL(`https://fw.example${path}`))?.toString() ?? null;

describe("magicLinkCleanup", () => {
  it("leaves normal URLs alone", () => {
    expect(cleanup("/zh-TW")).toBe(null);
    expect(cleanup("/en/watches/new?deleted=x")).toBe(null);
  });

  it("sends a stray ?code= through the auth callback with the page's locale", () => {
    expect(cleanup("/zh-TW?code=abc&locale=en")).toBe("https://fw.example/auth/callback?code=abc&locale=zh-TW");
  });

  it("uses the locale parameter when the path has none", () => {
    expect(cleanup("/?code=abc&locale=en")).toBe("https://fw.example/auth/callback?code=abc&locale=en");
    expect(cleanup("/?code=abc")).toBe("https://fw.example/auth/callback?code=abc");
  });

  it("strips a leftover locale parameter", () => {
    expect(cleanup("/zh-TW?locale=zh-TW")).toBe("https://fw.example/zh-TW");
    expect(cleanup("/en?locale=en&deleted=1")).toBe("https://fw.example/en?deleted=1");
  });
});
