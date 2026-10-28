import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { WeatherCondition } from "../../src/services/weatherCondition";
import {
  SMHI_CODE_TO_WEATHER_TYPE,
  WEATHER_TYPE_ARTWORK,
  mapTemperatureToIconBand,
  resolveWeatherTypeForBand,
  resolveConditionIcon,
  resolveConditionIconFromCondition,
  type IconTempBand,
  type WeatherType,
} from "../../src/components/smhiSymbolIcons";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 5, 15, 12, 0, 0) });
});
afterEach(() => {
  vi.useRealTimers();
});

const ALL_BANDS: IconTempBand[] = ["frozen", "cold", "nearzero", "mild", "warm", "hot"];
const ALL_TYPES: WeatherType[] = [
  "clear",
  "nearly-clear",
  "variable",
  "cloudy",
  "overcast",
  "fog",
  "rain-light",
  "rain-heavy",
  "thunder",
  "sleet",
  "snow-light",
  "snow-heavy",
  "windy-clear",
  "windy-variable",
  "windy-cloudy",
  "rain-light-windy",
  "rain-heavy-windy",
  "snow-light-windy",
  "snow-heavy-windy",
];

describe("SMHI_CODE_TO_WEATHER_TYPE (063-replace-weather-icons)", () => {
  it("has exactly one entry per SMHI symbol_code, 1 through 27", () => {
    const keys = Object.keys(SMHI_CODE_TO_WEATHER_TYPE)
      .map(Number)
      .sort((a, b) => a - b);
    expect(keys).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
  });

  it("maps every code to one of the 12 recognized weather types", () => {
    for (const [code, type] of Object.entries(SMHI_CODE_TO_WEATHER_TYPE)) {
      expect(ALL_TYPES, `code ${code}`).toContain(type);
    }
  });

  it("groups codes 8, 9, 18, 19 together as rain-light, per sheet-manifest.json's code_mapping", () => {
    expect(SMHI_CODE_TO_WEATHER_TYPE[8]).toBe("rain-light");
    expect(SMHI_CODE_TO_WEATHER_TYPE[9]).toBe("rain-light");
    expect(SMHI_CODE_TO_WEATHER_TYPE[18]).toBe("rain-light");
    expect(SMHI_CODE_TO_WEATHER_TYPE[19]).toBe("rain-light");
  });

  it("keeps light-rain-showers (9) and heavy-rain-showers (10) as distinct weather types", () => {
    expect(SMHI_CODE_TO_WEATHER_TYPE[9]).not.toBe(SMHI_CODE_TO_WEATHER_TYPE[10]);
  });
});

describe("WEATHER_TYPE_ARTWORK (063-replace-weather-icons)", () => {
  it("has a day and night image for every generated combination, and they differ", () => {
    let checked = 0;
    for (const type of ALL_TYPES) {
      for (const band of ALL_BANDS) {
        const entry = WEATHER_TYPE_ARTWORK[type]?.[band];
        if (!entry) continue; // a deliberately-not-generated combination (US2 fallback covers it)
        expect(entry.day, `${type}/${band} day`).toBeTruthy();
        expect(entry.night, `${type}/${band} night`).toBeTruthy();
        expect(entry.day, `${type}/${band} day vs night`).not.toBe(entry.night);
        checked++;
      }
    }
    // 62 base entries + 3 windy sky types x 6 bands + 2 windy rain types x 4 bands
    // + 2 windy snow types x 3 bands = 94.
    expect(checked).toBe(94);
  });

  it("has no generated artwork for rain at frozen/cold or snow at mild/warm/hot (the fallback cases)", () => {
    expect(WEATHER_TYPE_ARTWORK["rain-light"]?.frozen).toBeUndefined();
    expect(WEATHER_TYPE_ARTWORK["rain-light"]?.cold).toBeUndefined();
    expect(WEATHER_TYPE_ARTWORK["rain-heavy"]?.frozen).toBeUndefined();
    for (const type of ["rain-light-windy", "rain-heavy-windy"] as WeatherType[]) {
      expect(WEATHER_TYPE_ARTWORK[type]?.frozen).toBeUndefined();
      expect(WEATHER_TYPE_ARTWORK[type]?.cold).toBeUndefined();
    }
    expect(WEATHER_TYPE_ARTWORK["rain-heavy"]?.cold).toBeUndefined();
    expect(WEATHER_TYPE_ARTWORK["snow-light"]?.mild).toBeUndefined();
    expect(WEATHER_TYPE_ARTWORK["snow-light"]?.warm).toBeUndefined();
    expect(WEATHER_TYPE_ARTWORK["snow-light"]?.hot).toBeUndefined();
    expect(WEATHER_TYPE_ARTWORK["snow-heavy"]?.mild).toBeUndefined();
    expect(WEATHER_TYPE_ARTWORK["snow-heavy"]?.warm).toBeUndefined();
    expect(WEATHER_TYPE_ARTWORK["snow-heavy"]?.hot).toBeUndefined();
  });
});

describe("mapTemperatureToIconBand (063-replace-weather-icons)", () => {
  it("resolves boundary values to the warmer of the two adjacent bands", () => {
    expect(mapTemperatureToIconBand(-20)).toBe("cold");
    expect(mapTemperatureToIconBand(-5)).toBe("nearzero");
    expect(mapTemperatureToIconBand(5)).toBe("mild");
    expect(mapTemperatureToIconBand(15)).toBe("warm");
    expect(mapTemperatureToIconBand(25)).toBe("hot");
  });

  it("resolves values just below each boundary to the colder band", () => {
    expect(mapTemperatureToIconBand(-20.1)).toBe("frozen");
    expect(mapTemperatureToIconBand(-5.1)).toBe("cold");
    expect(mapTemperatureToIconBand(4.9)).toBe("nearzero");
    expect(mapTemperatureToIconBand(14.9)).toBe("mild");
    expect(mapTemperatureToIconBand(24.9)).toBe("warm");
  });

  it("resolves extreme values to the outermost bands", () => {
    expect(mapTemperatureToIconBand(-40)).toBe("frozen");
    expect(mapTemperatureToIconBand(40)).toBe("hot");
  });
});

describe("resolveWeatherTypeForBand (063-replace-weather-icons, US2)", () => {
  it("falls back rain to sleet at the two coldest bands", () => {
    expect(resolveWeatherTypeForBand("rain-light", "frozen")).toBe("sleet");
    expect(resolveWeatherTypeForBand("rain-light", "cold")).toBe("sleet");
    expect(resolveWeatherTypeForBand("rain-heavy", "frozen")).toBe("sleet");
    expect(resolveWeatherTypeForBand("rain-heavy", "cold")).toBe("sleet");
  });

  it("falls back snow to sleet at the three warmest bands", () => {
    expect(resolveWeatherTypeForBand("snow-light", "mild")).toBe("sleet");
    expect(resolveWeatherTypeForBand("snow-light", "warm")).toBe("sleet");
    expect(resolveWeatherTypeForBand("snow-light", "hot")).toBe("sleet");
    expect(resolveWeatherTypeForBand("snow-heavy", "mild")).toBe("sleet");
    expect(resolveWeatherTypeForBand("snow-heavy", "warm")).toBe("sleet");
    expect(resolveWeatherTypeForBand("snow-heavy", "hot")).toBe("sleet");
  });

  it("leaves every other combination unchanged", () => {
    expect(resolveWeatherTypeForBand("rain-light", "nearzero")).toBe("rain-light");
    expect(resolveWeatherTypeForBand("rain-heavy", "hot")).toBe("rain-heavy");
    expect(resolveWeatherTypeForBand("snow-light", "frozen")).toBe("snow-light");
    expect(resolveWeatherTypeForBand("thunder", "hot")).toBe("thunder");
    expect(resolveWeatherTypeForBand("clear", "mild")).toBe("clear");
  });
});

describe("resolveConditionIcon / resolveConditionIconFromCondition (063-replace-weather-icons, US1)", () => {
  it("resolves a real smhiSymbolCode + temperature to that weather type's day artwork", () => {
    // Code 19 (moderate rain) -> rain-light; 10C -> mild band.
    const icon = resolveConditionIconFromCondition(19, null, false, 10);

    expect(icon?.kind).toBe("smhi-symbol");
    if (icon?.kind === "smhi-symbol") {
      expect(icon.src).toBe(WEATHER_TYPE_ARTWORK["rain-light"]?.mild?.day);
      // .label is a translation KEY (064-swedish-translation), not display text.
      expect(icon.label).toBe("smhiCode.19");
    }
  });

  it("resolves the night artwork when isNightNow is true, distinct from the day artwork", () => {
    const day = resolveConditionIconFromCondition(11, null, false, 10);
    const night = resolveConditionIconFromCondition(11, null, true, 10);

    expect(day?.kind).toBe("smhi-symbol");
    expect(night?.kind).toBe("smhi-symbol");
    if (day?.kind === "smhi-symbol" && night?.kind === "smhi-symbol") {
      expect(night.src).not.toBe(day.src);
      expect(night.src).toBe(WEATHER_TYPE_ARTWORK.thunder?.mild?.night);
    }
  });

  it("keeps codes 9 vs 10 (moderate vs heavy rain showers) visually distinct", () => {
    const nine = resolveConditionIconFromCondition(9, null, false, 10);
    const ten = resolveConditionIconFromCondition(10, null, false, 10);

    expect(nine?.kind).toBe("smhi-symbol");
    expect(ten?.kind).toBe("smhi-symbol");
    if (nine?.kind === "smhi-symbol" && ten?.kind === "smhi-symbol") {
      expect(nine.src).not.toBe(ten.src);
    }
  });

  it("falls back to the best-fit code (via CONDITION_SMHI_FALLBACK) when smhiSymbolCode is absent", () => {
    const icon = resolveConditionIcon({
      temperature: 10,
      precipitation: 0,
      windSpeed: 1,
      cloudCoverPercent: 5,
      timestamp: "2026-06-01T12:00:00Z",
    });

    expect(icon?.kind).toBe("smhi-symbol");
    expect(icon?.label).toBe("weatherCondition.clearDay");
    if (icon?.kind === "smhi-symbol") {
      expect(icon.src).toBe(WEATHER_TYPE_ARTWORK.clear?.mild?.day);
    }
  });

  it("falls back to the best-fit code when smhiSymbolCode is null (from-condition variant)", () => {
    const icon = resolveConditionIconFromCondition(null, "cloudy", false, 10);

    expect(icon?.kind).toBe("smhi-symbol");
    expect(icon?.label).toBe("weatherCondition.cloudy");
    if (icon?.kind === "smhi-symbol") {
      expect(icon.src).toBe(WEATHER_TYPE_ARTWORK.cloudy?.mild?.day);
    }
  });

  it("gives the 'windy' condition windy art without a badge, keeping the Windy label (day and night)", () => {
    const day = resolveConditionIconFromCondition(null, "windy", false, 10);
    expect(day?.kind).toBe("smhi-symbol");
    expect(day?.label).toBe("weatherCondition.windy");
    if (day?.kind === "smhi-symbol") {
      expect(day.windy).toBeUndefined();
      expect(day.src).toBe(WEATHER_TYPE_ARTWORK["windy-variable"]?.mild?.day);
    }
    const night = resolveConditionIconFromCondition(null, "windy", true, 10);
    if (night?.kind === "smhi-symbol") {
      expect(night.windy).toBeUndefined();
      expect(night.src).toBe(WEATHER_TYPE_ARTWORK["windy-variable"]?.mild?.night);
    } else {
      throw new Error("expected artwork");
    }
  });

  it("picks the windy sky from the sky-only condition", () => {
    const src = (sky: WeatherCondition | null) => {
      const i = resolveConditionIconFromCondition(null, "windy", false, 10, true, sky);
      return i?.kind === "smhi-symbol" ? i.src : undefined;
    };
    expect(src("clear-day")).toBe(WEATHER_TYPE_ARTWORK["windy-clear"]?.mild?.day);
    expect(src("partly-cloudy")).toBe(WEATHER_TYPE_ARTWORK["windy-variable"]?.mild?.day);
    expect(src("cloudy")).toBe(WEATHER_TYPE_ARTWORK["windy-cloudy"]?.mild?.day);
    expect(src(null)).toBe(WEATHER_TYPE_ARTWORK["windy-variable"]?.mild?.day);
  });

  it("derives the windy sky from cloud cover in resolveConditionIcon", () => {
    const base = { temperature: 10, precipitation: 0, windSpeed: 12 };
    const srcFor = (cloudCoverPercent: number) => {
      const i = resolveConditionIcon({ ...base, cloudCoverPercent });
      return i?.kind === "smhi-symbol" ? i.src : undefined;
    };
    expect(srcFor(10)).toBe(WEATHER_TYPE_ARTWORK["windy-clear"]?.mild?.day);
    expect(srcFor(60)).toBe(WEATHER_TYPE_ARTWORK["windy-variable"]?.mild?.day);
    expect(srcFor(95)).toBe(WEATHER_TYPE_ARTWORK["windy-cloudy"]?.mild?.day);
  });

  it("maps windy variants of clear/variable/cloudy/rain to windy art with no badge where art exists", () => {
    const cases: Array<[number, WeatherType, number]> = [
      [1, "windy-clear", 10],
      [2, "windy-clear", 10],
      [4, "windy-variable", 10],
      [5, "windy-cloudy", 10],
      [6, "windy-cloudy", 10],
      [18, "rain-light-windy", 10],
      [10, "rain-heavy-windy", 10],
      [1, "windy-clear", -30], // frozen has windy sky art
      [15, "snow-light-windy", -10],
      [27, "snow-heavy-windy", -10],
      [15, "snow-light-windy", -30],
    ];
    for (const [code, type, temp] of cases) {
      const band = mapTemperatureToIconBand(temp);
      const icon = resolveConditionIconFromCondition(code, null, false, temp, true);
      expect(icon?.kind).toBe("smhi-symbol");
      if (icon?.kind === "smhi-symbol") {
        expect(icon.src, `code ${code}`).toBe(WEATHER_TYPE_ARTWORK[type]?.[band]?.day);
        expect(icon.windy).toBeUndefined();
      }
    }
  });

  it("uses night art for windy variants when the night flag is set", () => {
    const icon = resolveConditionIconFromCondition(18, null, true, 10, true);
    expect(icon?.kind).toBe("smhi-symbol");
    if (icon?.kind === "smhi-symbol") {
      expect(icon.src).toBe(WEATHER_TYPE_ARTWORK["rain-light-windy"]?.mild?.night);
    }
  });

  it("keeps base art plus a badge when no windy art exists (sleet, thunder, fog, rain at frozen)", () => {
    const cases: Array<[number, number, WeatherType]> = [
      [11, 10, "thunder"],
      [7, 10, "fog"],
      [13, 0, "sleet"],
      [18, -30, "sleet"], // rain at frozen falls back to sleet
      [15, 10, "sleet"], // snow at mild falls back to sleet
      [20, -10, "sleet"],
    ];
    for (const [code, temp, type] of cases) {
      const band = mapTemperatureToIconBand(temp);
      const icon = resolveConditionIconFromCondition(code, null, false, temp, true);
      expect(icon?.kind).toBe("smhi-symbol");
      if (icon?.kind === "smhi-symbol") {
        expect(icon.src, `code ${code}`).toBe(WEATHER_TYPE_ARTWORK[type]?.[band]?.day);
        expect(icon.windy).toBe(true);
      }
    }
  });

  it("resolveConditionIcon takes windiness from windSpeed (>= 8 m/s)", () => {
    const calm = resolveConditionIcon({ temperature: 10, precipitation: 0.5, windSpeed: 3, cloudCoverPercent: 90 });
    const windy = resolveConditionIcon({ temperature: 10, precipitation: 0.5, windSpeed: 9, cloudCoverPercent: 90 });
    if (calm?.kind === "smhi-symbol" && windy?.kind === "smhi-symbol") {
      expect(calm.src).toBe(WEATHER_TYPE_ARTWORK["rain-light"]?.mild?.day);
      expect(windy.src).toBe(WEATHER_TYPE_ARTWORK["rain-light-windy"]?.mild?.day);
      expect(windy.windy).toBeUndefined();
    } else {
      throw new Error("expected artwork");
    }
  });

  it("does not flag non-windy icons as windy", () => {
    const icon = resolveConditionIconFromCondition(null, "cloudy", false, 10);
    expect(icon && "windy" in icon).toBe(false);
  });

  it("returns null when there isn't enough data to classify and no smhiSymbolCode is present", () => {
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

  it("ignores an out-of-range smhiSymbolCode and falls back to the best-fit code", () => {
    const icon = resolveConditionIconFromCondition(999, "cloudy", false, 10);

    expect(icon?.kind).toBe("smhi-symbol");
    expect(icon?.label).toBe("weatherCondition.cloudy");
  });
});

describe("Missing-temperature fallback (063-replace-weather-icons, US3)", () => {
  it("still resolves defined artwork (the nearzero-band default) when temperature is null", () => {
    const withNullTemp = resolveConditionIconFromCondition(1, null, false, null);
    const withNearzeroTemp = resolveConditionIconFromCondition(1, null, false, 0);

    expect(withNullTemp?.kind).toBe("smhi-symbol");
    expect(withNullTemp).toEqual(withNearzeroTemp);
  });

  it("resolveConditionIcon also falls back to the default band when temperature is null", () => {
    const icon = resolveConditionIcon({
      temperature: null,
      precipitation: 0,
      windSpeed: 1,
      cloudCoverPercent: 0,
      timestamp: "2026-06-01T12:00:00Z",
      smhiSymbolCode: 1,
    });

    expect(icon?.kind).toBe("smhi-symbol");
    if (icon?.kind === "smhi-symbol") {
      expect(icon.src).toBe(WEATHER_TYPE_ARTWORK.clear?.nearzero?.day);
    }
  });

  it("defaults to the day icon when isNightNow is omitted", () => {
    const omitted = resolveConditionIconFromCondition(1, null, undefined, 10);
    const explicitDay = resolveConditionIconFromCondition(1, null, false, 10);

    expect(omitted).toEqual(explicitDay);
  });
});

describe("Fallback path ignores isNightNow, uses condition itself (056-fix-night-moon)", () => {
  it("never resolves a whole-day-style clear-day condition to the night icon, even if isNightNow is spuriously true", () => {
    // Simulates a whole-day (7-day view) column: condition is always "clear-day" (never
    // "clear-night", by timelineData.ts's own no-timestamp-passed rule), but isNightNow could be
    // true simply because the page happened to load at night — that must not matter here.
    const day = resolveConditionIconFromCondition(null, "clear-day", false, 10);
    const spuriousNight = resolveConditionIconFromCondition(null, "clear-day", true, 10);

    expect(spuriousNight).toEqual(day);
  });

  it("still resolves a genuinely clear-night condition to the night icon regardless of isNightNow", () => {
    const withFlagTrue = resolveConditionIconFromCondition(null, "clear-night", true, 10);
    const withFlagFalse = resolveConditionIconFromCondition(null, "clear-night", false, 10);

    expect(withFlagTrue).toEqual(withFlagFalse);
    expect(withFlagTrue?.kind).toBe("smhi-symbol");
    if (withFlagTrue?.kind === "smhi-symbol") {
      const day = resolveConditionIconFromCondition(null, "clear-day", false, 10);
      expect(day?.kind).toBe("smhi-symbol");
      if (day?.kind === "smhi-symbol") {
        expect(withFlagTrue.src).not.toBe(day.src);
      }
    }
  });
});
