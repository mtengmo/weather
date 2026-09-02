import { describe, expect, it } from "vitest";
import { deriveFeelsLike } from "../../src/services/feelsLike";

describe("deriveFeelsLike (008-timeline-dashboard-redesign)", () => {
  it("returns null when temperature is null", () => {
    expect(deriveFeelsLike({ temperature: null, windSpeed: 5, relativeHumidity: 50 })).toBeNull();
  });

  it("applies wind chill for cold, windy conditions", () => {
    const result = deriveFeelsLike({ temperature: 0, windSpeed: 10, relativeHumidity: null });
    expect(result).not.toBeNull();
    // Wind chill should make it feel colder than the raw temperature.
    expect(result!).toBeLessThan(0);
  });

  it("returns the raw temperature for cold conditions with no wind data", () => {
    expect(deriveFeelsLike({ temperature: 0, windSpeed: null, relativeHumidity: null })).toBe(0);
  });

  it("does not apply wind chill for negligible wind speed", () => {
    // 1 m/s = 3.6 km/h, below the 4.8 km/h wind-chill validity threshold.
    expect(deriveFeelsLike({ temperature: 0, windSpeed: 1, relativeHumidity: null })).toBe(0);
  });

  it("applies a heat index for warm, humid conditions", () => {
    const result = deriveFeelsLike({ temperature: 30, windSpeed: null, relativeHumidity: 80 });
    expect(result).not.toBeNull();
    // High humidity should make it feel warmer than the raw temperature.
    expect(result!).toBeGreaterThan(30);
  });

  it("returns the raw temperature for warm conditions with no humidity data", () => {
    expect(deriveFeelsLike({ temperature: 30, windSpeed: null, relativeHumidity: null })).toBe(30);
  });

  it("returns the raw temperature for mild, in-between conditions", () => {
    expect(deriveFeelsLike({ temperature: 18, windSpeed: 5, relativeHumidity: 50 })).toBe(18);
  });
});
