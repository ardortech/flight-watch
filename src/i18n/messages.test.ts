import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import zh from "../../messages/zh-TW.json";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("messages", () => {
  it("has every string in both languages", () => {
    expect(keys(zh).sort()).toEqual(keys(en).sort());
  });
});
