import { describe, expect, it } from "vitest";
import { getMoonPhase, getSunTimes } from "../../src/services/sunMoon";

describe("getSunTimes (008-timeline-dashboard-redesign)", () => {
  it("returns a sunrise before sunset for a known date/location, within a few minutes of a live reference", () => {
    // Reference captured live from Open-Meteo during planning (2026-09-02, Stockholm):
    // sunrise 03:47 UTC, sunset 17:47 UTC.
    const stockholm = { latitude: 59.3293, longitude: 18.0686 };
    const date = new Date("2026-09-02T12:00:00Z");

    const { sunrise, sunset } = getSunTimes(stockholm, date);
    expect(sunrise).not.toBeNull();
    expect(sunset).not.toBeNull();

    const sunriseMs = Date.parse(sunrise!);
    const sunsetMs = Date.parse(sunset!);
    expect(sunriseMs).toBeLessThan(sunsetMs);

    const expectedSunrise = Date.parse("2026-09-02T03:47:00Z");
    const expectedSunset = Date.parse("2026-09-02T17:47:00Z");
    const fiveMinutesMs = 5 * 60_000;
    expect(Math.abs(sunriseMs - expectedSunrise)).toBeLessThan(fiveMinutesMs);
    expect(Math.abs(sunsetMs - expectedSunset)).toBeLessThan(fiveMinutesMs);
  });

  it("returns null for both sunrise and sunset during polar day (far north, midsummer)", () => {
    // ~78°N (well above the Arctic Circle), late June — continuous daylight.
    const farNorth = { latitude: 78.2, longitude: 15.6 };
    const midsummer = new Date("2026-06-21T12:00:00Z");

    const { sunrise, sunset } = getSunTimes(farNorth, midsummer);
    expect(sunrise).toBeNull();
    expect(sunset).toBeNull();
  });

  it("returns plausible, non-null times for a location near the equator", () => {
    const nairobi = { latitude: -1.29, longitude: 36.82 };
    const { sunrise, sunset } = getSunTimes(nairobi, new Date("2026-09-02T12:00:00Z"));
    expect(sunrise).not.toBeNull();
    expect(sunset).not.toBeNull();
  });
});

describe("getMoonPhase (008-timeline-dashboard-redesign)", () => {
  it("is deterministic for the same date", () => {
    const date = new Date("2026-09-02T12:00:00Z");
    expect(getMoonPhase(date)).toBe(getMoonPhase(date));
  });

  it("cycles through all 8 phase names over one synodic month", () => {
    const start = new Date("2026-09-01T00:00:00Z").getTime();
    const synodicMonthMs = 29.53059 * 24 * 3600_000;
    const stepMs = synodicMonthMs / 16; // sample more finely than 8 buckets to catch every phase

    const seen = new Set<string>();
    for (let t = start; t < start + synodicMonthMs; t += stepMs) {
      seen.add(getMoonPhase(new Date(t)));
    }

    expect(seen.size).toBe(8);
  });
});
