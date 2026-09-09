import { describe, expect, it } from "vitest";
import {
  SMHI_SYMBOL_ICONS,
  resolveConditionIcon,
  resolveConditionIconFromCondition,
} from "../../src/components/smhiSymbolIcons";

describe("SMHI_SYMBOL_ICONS (043-smhi-27-symbol-icons, US1)", () => {
  it("has exactly one entry per SMHI symbol_code, 1 through 27", () => {
    const keys = Object.keys(SMHI_SYMBOL_ICONS)
      .map(Number)
      .sort((a, b) => a - b);
    expect(keys).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
  });

  it("gives every code a non-empty src and label", () => {
    for (const [code, entry] of Object.entries(SMHI_SYMBOL_ICONS)) {
      expect(entry.src, `code ${code} src`).toBeTruthy();
      expect(entry.label, `code ${code} label`).toBeTruthy();
    }
  });

  it("never points two different codes at the same icon file (US3, FR-005 guard)", () => {
    const srcs = Object.values(SMHI_SYMBOL_ICONS).map((e) => e.src);
    expect(new Set(srcs).size).toBe(srcs.length);
  });
});

describe("resolveConditionIcon / resolveConditionIconFromCondition (043-smhi-27-symbol-icons, US1/US2)", () => {
  it("resolves distinct icons for codes that today's WeatherCondition collapses together (9 vs 10, moderate vs heavy rain showers)", () => {
    const nine = resolveConditionIconFromCondition(9, "heavy-rain");
    const ten = resolveConditionIconFromCondition(10, "heavy-rain");

    expect(nine?.kind).toBe("smhi-symbol");
    expect(ten?.kind).toBe("smhi-symbol");
    expect(nine).not.toEqual(ten);
    if (nine?.kind === "smhi-symbol" && ten?.kind === "smhi-symbol") {
      expect(nine.src).not.toBe(ten.src);
    }
  });

  it("resolves every one of the 27 codes to a distinct icon via the full resolver", () => {
    const seen = new Set<string>();
    for (let code = 1; code <= 27; code++) {
      const icon = resolveConditionIcon({
        temperature: 10,
        precipitation: 1,
        windSpeed: 1,
        cloudCoverPercent: 50,
        timestamp: "2026-06-01T12:00:00Z",
        smhiSymbolCode: code,
      });
      expect(icon?.kind, `code ${code}`).toBe("smhi-symbol");
      if (icon?.kind === "smhi-symbol") {
        expect(seen.has(icon.src), `code ${code} reused an earlier icon`).toBe(false);
        seen.add(icon.src);
      }
    }
    expect(seen.size).toBe(27);
  });

  it("falls back to the best-fit SMHI icon (not the lucide set) when smhiSymbolCode is absent (US2, extended for observations)", () => {
    const icon = resolveConditionIcon({
      temperature: 10,
      precipitation: 0,
      windSpeed: 1,
      cloudCoverPercent: 5,
      timestamp: "2026-06-01T12:00:00Z",
    });

    expect(icon?.kind).toBe("smhi-symbol");
    expect(icon?.label).toBe("Clear");
    if (icon?.kind === "smhi-symbol") {
      expect(icon.src).toBe(SMHI_SYMBOL_ICONS[1].src);
    }
  });

  it("falls back to the best-fit SMHI icon when smhiSymbolCode is null", () => {
    const icon = resolveConditionIconFromCondition(null, "cloudy");

    expect(icon?.kind).toBe("smhi-symbol");
    expect(icon?.label).toBe("Cloudy");
    if (icon?.kind === "smhi-symbol") {
      expect(icon.src).toBe(SMHI_SYMBOL_ICONS[5].src);
    }
  });

  it("still uses the lucide fallback for 'windy', which has no SMHI artwork equivalent", () => {
    const icon = resolveConditionIconFromCondition(null, "windy");

    expect(icon?.kind).toBe("condition");
    expect(icon?.label).toBe("Windy");
  });

  it("returns null when there isn't enough data to classify and no smhiSymbolCode is present (unchanged from today)", () => {
    const icon = resolveConditionIcon({
      temperature: null,
      precipitation: null,
      windSpeed: null,
      cloudCoverPercent: null,
    });

    expect(icon).toBeNull();
  });

  it("returns null when smhiSymbolCode is absent and condition is null (from-condition variant)", () => {
    expect(resolveConditionIconFromCondition(undefined, null)).toBeNull();
  });

  it("ignores an out-of-range smhiSymbolCode and falls back to the best-fit SMHI icon", () => {
    const icon = resolveConditionIconFromCondition(999, "cloudy");

    expect(icon?.kind).toBe("smhi-symbol");
    expect(icon?.label).toBe("Cloudy");
  });
});
