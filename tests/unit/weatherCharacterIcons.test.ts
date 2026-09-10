import { describe, expect, it } from "vitest";
import {
  CHARACTER_ICONS,
  mapConditionToPrecipCategory,
  mapTemperatureToBand,
  resolveCharacterIcon,
  type PrecipCategory,
  type TempBand,
} from "../../src/components/weatherCharacterIcons";

const PRECIP_CATEGORIES: PrecipCategory[] = ["dry", "rain", "thunder", "sleet", "snow"];
const TEMP_BANDS: TempBand[] = ["frozen", "cold", "mild", "warm", "hot"];

describe("resolveCharacterIcon (061-cartoon-weather-companion, US1)", () => {
  it("resolves the rain/mild asset for a representative rain condition at a mild temperature", () => {
    const result = resolveCharacterIcon("heavy-rain", 10);

    expect(result).toBe(CHARACTER_ICONS.rain.mild);
  });

  it("returns null when the condition is null (FR-005)", () => {
    expect(resolveCharacterIcon(null, 10)).toBeNull();
  });

  it("returns null when the temperature is null", () => {
    expect(resolveCharacterIcon("clear-day", null)).toBeNull();
  });
});

describe("CHARACTER_ICONS full coverage (061-cartoon-weather-companion, US2)", () => {
  it("has a defined, distinct asset for all 25 precipitation x temperature-band combinations", () => {
    const seen = new Set<string>();
    for (const precip of PRECIP_CATEGORIES) {
      for (const band of TEMP_BANDS) {
        const src = CHARACTER_ICONS[precip][band];
        expect(src, `${precip}/${band}`).toBeTruthy();
        expect(seen.has(src), `${precip}/${band} duplicates another combination's asset`).toBe(false);
        seen.add(src);
      }
    }
    expect(seen.size).toBe(25);
  });
});

describe("mapConditionToPrecipCategory (061-cartoon-weather-companion, US2)", () => {
  it("maps windy to dry, since there's no dedicated windy art (Edge Cases)", () => {
    expect(mapConditionToPrecipCategory("windy")).toBe("dry");
  });

  it("maps thunderstorm to thunder, distinct from heavy-rain's rain category", () => {
    expect(mapConditionToPrecipCategory("thunderstorm")).toBe("thunder");
    expect(mapConditionToPrecipCategory("heavy-rain")).toBe("rain");
    expect(mapConditionToPrecipCategory("thunderstorm")).not.toBe(mapConditionToPrecipCategory("heavy-rain"));
  });

  it("maps light-snow and heavy-snow both to snow", () => {
    expect(mapConditionToPrecipCategory("light-snow")).toBe("snow");
    expect(mapConditionToPrecipCategory("heavy-snow")).toBe("snow");
  });

  it("maps sleet to sleet", () => {
    expect(mapConditionToPrecipCategory("sleet")).toBe("sleet");
  });

  it("maps every dry-ish condition (clear/partly-cloudy/cloudy/foggy) to dry", () => {
    for (const condition of ["clear-day", "clear-night", "partly-cloudy", "cloudy", "foggy"] as const) {
      expect(mapConditionToPrecipCategory(condition)).toBe("dry");
    }
  });
});

describe("mapTemperatureToBand (061-cartoon-weather-companion, US2)", () => {
  it("resolves boundary values to the warmer of the two adjacent bands (Edge Cases)", () => {
    expect(mapTemperatureToBand(-20)).toBe("cold");
    expect(mapTemperatureToBand(0)).toBe("mild");
    expect(mapTemperatureToBand(15)).toBe("warm");
    expect(mapTemperatureToBand(25)).toBe("hot");
  });

  it("resolves values just below each boundary to the colder band", () => {
    expect(mapTemperatureToBand(-20.1)).toBe("frozen");
    expect(mapTemperatureToBand(-0.1)).toBe("cold");
    expect(mapTemperatureToBand(14.9)).toBe("mild");
    expect(mapTemperatureToBand(24.9)).toBe("warm");
  });

  it("resolves extreme values to the outermost bands", () => {
    expect(mapTemperatureToBand(-40)).toBe("frozen");
    expect(mapTemperatureToBand(40)).toBe("hot");
  });
});
