import { describe, expect, it } from "vitest";
import { deriveWeatherCondition } from "../../src/services/weatherCondition";

const DAY = "2026-08-31T12:00:00"; // local noon
const NIGHT = "2026-08-31T23:00:00"; // local 11pm

function base(overrides: Partial<Parameters<typeof deriveWeatherCondition>[0]> = {}) {
  return {
    temperature: 15,
    precipitation: 0,
    windSpeed: 2,
    cloudCoverPercent: 10,
    timestamp: DAY,
    ...overrides,
  };
}

describe("deriveWeatherCondition (007-weather-icon-overview)", () => {
  it("returns null (no data) when temperature and precipitation are both null", () => {
    expect(
      deriveWeatherCondition({
        temperature: null,
        precipitation: null,
        windSpeed: 5,
        cloudCoverPercent: 50,
        timestamp: DAY,
      })
    ).toBeNull();
  });

  it("does not treat a single missing field as 'no data' when temperature or precipitation is present", () => {
    expect(deriveWeatherCondition(base({ precipitation: null }))).not.toBeNull();
    expect(deriveWeatherCondition(base({ temperature: null, precipitation: 0 }))).not.toBeNull();
  });

  it("returns snowy when precipitation is positive and temperature is at or below freezing", () => {
    expect(deriveWeatherCondition(base({ precipitation: 1, temperature: 0 }))).toBe("snowy");
    expect(deriveWeatherCondition(base({ precipitation: 1, temperature: -5 }))).toBe("snowy");
  });

  it("returns rainy when precipitation is positive and temperature is above freezing", () => {
    expect(deriveWeatherCondition(base({ precipitation: 1, temperature: 0.1 }))).toBe("rainy");
    expect(deriveWeatherCondition(base({ precipitation: 1, temperature: 10 }))).toBe("rainy");
  });

  it("returns rainy (not snowy) when precipitation is positive but temperature is unknown", () => {
    expect(deriveWeatherCondition(base({ precipitation: 1, temperature: null }))).toBe("rainy");
  });

  it("returns windy when wind speed meets the threshold and there is no precipitation", () => {
    expect(deriveWeatherCondition(base({ windSpeed: 8, precipitation: 0 }))).toBe("windy");
    expect(deriveWeatherCondition(base({ windSpeed: 7.9, precipitation: 0 }))).not.toBe("windy");
  });

  it("returns cloudy when cloud cover meets the threshold and nothing higher-priority applies", () => {
    expect(deriveWeatherCondition(base({ cloudCoverPercent: 50, windSpeed: 0 }))).toBe("cloudy");
    expect(deriveWeatherCondition(base({ cloudCoverPercent: 49.9, windSpeed: 0 }))).not.toBe("cloudy");
  });

  it("returns clear-day for a clear daytime period", () => {
    expect(deriveWeatherCondition(base({ timestamp: DAY }))).toBe("clear-day");
  });

  it("returns clear-night for a clear nighttime period", () => {
    expect(deriveWeatherCondition(base({ timestamp: NIGHT }))).toBe("clear-night");
  });

  it("returns clear-day when timestamp is omitted (daily period), even for an hour that would be night", () => {
    expect(
      deriveWeatherCondition({
        temperature: 15,
        precipitation: 0,
        windSpeed: 2,
        cloudCoverPercent: 10,
      })
    ).toBe("clear-day");
  });

  it("resolves exactly one condition (the highest priority) when multiple are simultaneously true", () => {
    // Rainy AND windy AND cloudy all technically true — snowy > rainy > windy > cloudy > clear.
    expect(
      deriveWeatherCondition(
        base({ precipitation: 1, temperature: 10, windSpeed: 20, cloudCoverPercent: 100 })
      )
    ).toBe("rainy");

    // Windy AND cloudy, no precipitation — windy wins.
    expect(deriveWeatherCondition(base({ windSpeed: 20, cloudCoverPercent: 100, precipitation: 0 }))).toBe(
      "windy"
    );
  });
});

describe("deriveWeatherCondition symbol-code precedence (022-met-forecast-source, research.md §3)", () => {
  it("returns the symbolCondition for thunderstorm even with very high wind", () => {
    expect(
      deriveWeatherCondition(base({ symbolCondition: "thunderstorm", windSpeed: 25, precipitation: 0 }))
    ).toBe("thunderstorm");
  });

  it("returns the symbolCondition for foggy even with very high wind", () => {
    expect(deriveWeatherCondition(base({ symbolCondition: "foggy", windSpeed: 25, precipitation: 0 }))).toBe(
      "foggy"
    );
  });

  it("returns the symbolCondition for sleet even with very high wind", () => {
    expect(deriveWeatherCondition(base({ symbolCondition: "sleet", windSpeed: 25, precipitation: 0 }))).toBe(
      "sleet"
    );
  });

  it("still classifies as windy when symbolCondition is cloudy and wind meets the threshold", () => {
    expect(
      deriveWeatherCondition(base({ symbolCondition: "cloudy", windSpeed: 20, precipitation: 0 }))
    ).toBe("windy");
  });

  it("uses the symbolCondition for clear-day/clear-night when no higher-priority signal applies", () => {
    expect(
      deriveWeatherCondition(base({ symbolCondition: "clear-night", windSpeed: 0, cloudCoverPercent: 0 }))
    ).toBe("clear-night");
  });

  it("falls back to the existing six-condition logic unchanged when no symbolCondition is present", () => {
    expect(deriveWeatherCondition(base({ symbolCondition: undefined }))).toBe("clear-day");
    expect(deriveWeatherCondition(base({ symbolCondition: null, precipitation: 1, temperature: 5 }))).toBe(
      "rainy"
    );
  });
});
