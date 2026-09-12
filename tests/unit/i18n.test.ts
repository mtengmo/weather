import { describe, expect, it } from "vitest";
import { en } from "../../src/i18n/en";
import { sv } from "../../src/i18n/sv";

describe("i18n resource parity (064-swedish-translation)", () => {
  it("has the exact same set of keys in en.ts and sv.ts", () => {
    const enKeys = Object.keys(en).sort();
    const svKeys = Object.keys(sv).sort();
    expect(svKeys).toEqual(enKeys);
  });

  it("has no empty-string values in either resource", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.${key}`).not.toBe("");
    }
    for (const [key, value] of Object.entries(sv)) {
      expect(value, `sv.${key}`).not.toBe("");
    }
  });

  it("has at least one translated key (sanity check that migration has actually happened)", () => {
    expect(Object.keys(en).length).toBeGreaterThan(0);
  });
});
