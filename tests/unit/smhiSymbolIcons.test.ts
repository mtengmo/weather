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

describe("Night-time moon variants for codes 1-4 (054-night-time-moon)", () => {
  it.each([1, 2, 3, 4])("resolves code %i to a distinct night icon when isNightNow is true", (code) => {
    const day = resolveConditionIconFromCondition(code, null, false);
    const night = resolveConditionIconFromCondition(code, null, true);

    expect(day?.kind).toBe("smhi-symbol");
    expect(night?.kind).toBe("smhi-symbol");
    if (day?.kind === "smhi-symbol" && night?.kind === "smhi-symbol") {
      expect(night.src).not.toBe(day.src);
    }
  });

  it("defaults to the day icon when isNightNow is omitted", () => {
    const omitted = resolveConditionIconFromCondition(1, null);
    const explicitDay = resolveConditionIconFromCondition(1, null, false);

    expect(omitted).toEqual(explicitDay);
  });

  it("leaves codes outside 1-4 unaffected by isNightNow (FR-003)", () => {
    const day = resolveConditionIconFromCondition(6, null, false);
    const night = resolveConditionIconFromCondition(6, null, true);

    expect(day).toEqual(night);
  });

  it("resolves the fallback (no smhiSymbolCode) clear-night condition to the night moon icon, not the day sun", () => {
    const dayFallback = resolveConditionIconFromCondition(null, "clear-day", false);
    const nightFallback = resolveConditionIconFromCondition(null, "clear-night", true);

    expect(dayFallback?.kind).toBe("smhi-symbol");
    expect(nightFallback?.kind).toBe("smhi-symbol");
    if (dayFallback?.kind === "smhi-symbol" && nightFallback?.kind === "smhi-symbol") {
      expect(nightFallback.src).not.toBe(dayFallback.src);
    }
  });

  it("resolveConditionIcon picks the night variant from a nighttime timestamp", () => {
    const night = resolveConditionIcon({
      temperature: 5,
      precipitation: 0,
      windSpeed: 1,
      cloudCoverPercent: 0,
      timestamp: "2026-06-01T23:00:00",
      smhiSymbolCode: 1,
    });
    const day = resolveConditionIcon({
      temperature: 5,
      precipitation: 0,
      windSpeed: 1,
      cloudCoverPercent: 0,
      timestamp: "2026-06-01T12:00:00",
      smhiSymbolCode: 1,
    });

    expect(night?.kind).toBe("smhi-symbol");
    expect(day?.kind).toBe("smhi-symbol");
    if (night?.kind === "smhi-symbol" && day?.kind === "smhi-symbol") {
      expect(night.src).not.toBe(day.src);
    }
  });
});

describe("Fallback path ignores isNightNow, uses condition itself (056-fix-night-moon)", () => {
  it("never resolves a whole-day-style clear-day condition to the night icon, even if isNightNow is spuriously true", () => {
    // Simulates a whole-day (7-day view) column: condition is always "clear-day" (never
    // "clear-night", by timelineData.ts's own no-timestamp-passed rule), but isNightNow could be
    // true simply because the page happened to load at night — that must not matter here.
    const day = resolveConditionIconFromCondition(null, "clear-day", false);
    const spuriousNight = resolveConditionIconFromCondition(null, "clear-day", true);

    expect(spuriousNight).toEqual(day);
  });

  it("still resolves a genuinely clear-night condition to the night icon regardless of isNightNow", () => {
    const withFlagTrue = resolveConditionIconFromCondition(null, "clear-night", true);
    const withFlagFalse = resolveConditionIconFromCondition(null, "clear-night", false);

    expect(withFlagTrue).toEqual(withFlagFalse);
    expect(withFlagTrue?.kind).toBe("smhi-symbol");
    if (withFlagTrue?.kind === "smhi-symbol") {
      const day = resolveConditionIconFromCondition(null, "clear-day", false);
      expect(day?.kind).toBe("smhi-symbol");
      if (day?.kind === "smhi-symbol") {
        expect(withFlagTrue.src).not.toBe(day.src);
      }
    }
  });
});
