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

  it("returns light-snow below the heavy threshold, and heavy-snow at/above it, when freezing (032-dashboard-polish-round-seven, US5)", () => {
    expect(deriveWeatherCondition(base({ precipitation: 1, temperature: 0 }))).toBe("light-snow");
    expect(deriveWeatherCondition(base({ precipitation: 2.5, temperature: -5 }))).toBe("heavy-snow");
  });

  it("returns light-rain below the heavy threshold, and heavy-rain at/above it, when above freezing", () => {
    expect(deriveWeatherCondition(base({ precipitation: 1, temperature: 0.1 }))).toBe("light-rain");
    expect(deriveWeatherCondition(base({ precipitation: 2.5, temperature: 10 }))).toBe("heavy-rain");
  });

  it("returns light-rain (not snow) when precipitation is positive but temperature is unknown", () => {
    expect(deriveWeatherCondition(base({ precipitation: 1, temperature: null }))).toBe("light-rain");
  });

  it("returns windy when wind speed meets the threshold and there is no precipitation", () => {
    expect(deriveWeatherCondition(base({ windSpeed: 8, precipitation: 0 }))).toBe("windy");
    expect(deriveWeatherCondition(base({ windSpeed: 7.9, precipitation: 0 }))).not.toBe("windy");
  });

  it("returns partly-cloudy at the light-cloud threshold, cloudy at the heavy/overcast threshold (038-granular-weather-icons-and-graph-header, US1)", () => {
    expect(deriveWeatherCondition(base({ cloudCoverPercent: 49.9, windSpeed: 0 }))).not.toBe("partly-cloudy");
    expect(deriveWeatherCondition(base({ cloudCoverPercent: 50, windSpeed: 0 }))).toBe("partly-cloudy");
    expect(deriveWeatherCondition(base({ cloudCoverPercent: 79.9, windSpeed: 0 }))).toBe("partly-cloudy");
    expect(deriveWeatherCondition(base({ cloudCoverPercent: 80, windSpeed: 0 }))).toBe("cloudy");
    expect(deriveWeatherCondition(base({ cloudCoverPercent: 100, windSpeed: 0 }))).toBe("cloudy");
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
    // Rainy AND windy AND cloudy all technically true — snow/rain > windy > cloudy > clear.
    expect(
      deriveWeatherCondition(
        base({ precipitation: 1, temperature: 10, windSpeed: 20, cloudCoverPercent: 100 })
      )
    ).toBe("light-rain");

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

  it("falls back to the existing threshold logic unchanged when no symbolCondition is present", () => {
    expect(deriveWeatherCondition(base({ symbolCondition: undefined }))).toBe("clear-day");
    expect(deriveWeatherCondition(base({ symbolCondition: null, precipitation: 1, temperature: 5 }))).toBe(
      "light-rain"
    );
  });
});

describe("deriveWeatherCondition precipitation intensity (032-dashboard-polish-round-seven, US5)", () => {
  it("takes the symbolCondition directly for each of the four light/heavy rain+snow values, even with very high wind", () => {
    for (const condition of ["light-rain", "heavy-rain", "light-snow", "heavy-snow"] as const) {
      expect(
        deriveWeatherCondition(base({ symbolCondition: condition, windSpeed: 25, precipitation: 0 }))
      ).toBe(condition);
    }
  });

  it("symbolCondition intensity wins even when the raw amount would suggest the other tier", () => {
    // A tiny amount, but the source's own symbol code already says "heavy" — trust the symbol.
    expect(
      deriveWeatherCondition(base({ symbolCondition: "heavy-rain", precipitation: 0.1, temperature: 10 }))
    ).toBe("heavy-rain");
    // A large amount, but the source's own symbol code already says "light".
    expect(
      deriveWeatherCondition(base({ symbolCondition: "light-snow", precipitation: 10, temperature: -5 }))
    ).toBe("light-snow");
  });

  it("mm-threshold fallback: exactly at the heavy boundary counts as heavy (inclusive)", () => {
    expect(deriveWeatherCondition(base({ precipitation: 2.5, temperature: 10 }))).toBe("heavy-rain");
    expect(deriveWeatherCondition(base({ precipitation: 2.4999, temperature: 10 }))).toBe("light-rain");
  });
});

describe("deriveWeatherCondition low-confidence rain/snow guard (038-granular-weather-icons-and-graph-header, US1)", () => {
  it("does not classify as rain when chanceOfRain is present and low, despite a small amount", () => {
    expect(
      deriveWeatherCondition(base({ precipitation: 0.2, temperature: 10, chanceOfRain: 7 }))
    ).not.toBe("light-rain");
    expect(
      deriveWeatherCondition(base({ precipitation: 0.2, temperature: 10, chanceOfRain: 7 }))
    ).not.toBe("heavy-rain");
  });

  it("does not classify as snow when chanceOfRain is present and low, despite a small amount", () => {
    expect(
      deriveWeatherCondition(base({ precipitation: 0.2, temperature: -2, chanceOfRain: 7 }))
    ).not.toBe("light-snow");
  });

  it("falls back to a sensible non-precipitation icon when the low-confidence guard suppresses rain", () => {
    expect(
      deriveWeatherCondition(base({ precipitation: 0.2, temperature: 10, chanceOfRain: 7, cloudCoverPercent: 10 }))
    ).toBe("clear-day");
  });

  it("still classifies as rain when chanceOfRain is present and high", () => {
    expect(
      deriveWeatherCondition(base({ precipitation: 0.2, temperature: 10, chanceOfRain: 60 }))
    ).toBe("light-rain");
  });

  it("still classifies as rain from amount alone when chanceOfRain is absent (observed/historical data, FR-003)", () => {
    expect(deriveWeatherCondition(base({ precipitation: 0.2, temperature: 10 }))).toBe("light-rain");
    expect(
      deriveWeatherCondition(base({ precipitation: 0.2, temperature: 10, chanceOfRain: null }))
    ).toBe("light-rain");
  });

  it("a large amount still classifies as rain even with a low chanceOfRain (amount takes precedence)", () => {
    expect(
      deriveWeatherCondition(base({ precipitation: 5, temperature: 10, chanceOfRain: 7 }))
    ).toBe("heavy-rain");
  });

  it("does not affect symbol-code-based rain classification", () => {
    expect(
      deriveWeatherCondition(
        base({ symbolCondition: "light-rain", precipitation: 0.2, chanceOfRain: 7, windSpeed: 0 })
      )
    ).toBe("light-rain");
  });
});
