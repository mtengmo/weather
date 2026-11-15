import { afterEach, describe, expect, it } from "vitest";
import { isNight, setDaylightLocation } from "../../src/services/daylight";
import { getSunTimes } from "../../src/services/sunMoon";

// Stockholm-ish. Sunrise/sunset come from the same getSunTimes the app uses, so the tests
// assert the whole-hour rule relative to them rather than hard-coding clock times.
const STOCKHOLM = { latitude: 59.33, longitude: 18.07 };

function localIso(y: number, m: number, d: number, h: number, min = 0): string {
  return new Date(y, m, d, h, min).toISOString();
}

afterEach(() => setDaylightLocation(null));

describe("isNight without a location", () => {
  it("uses the fixed 06:00-20:00 local-clock rule", () => {
    expect(isNight(localIso(2026, 5, 21, 5))).toBe(true);
    expect(isNight(localIso(2026, 5, 21, 6))).toBe(false);
    expect(isNight(localIso(2026, 5, 21, 19))).toBe(false);
    expect(isNight(localIso(2026, 5, 21, 20))).toBe(true);
  });
});

describe("isNight with a location (whole-hour rule)", () => {
  it("flips to night at the first full hour after sunset and to day at the first full hour after sunrise", () => {
    setDaylightLocation(STOCKHOLM);
    // Late November: short days, so real sunset is well before the fixed 20:00 rule.
    const date = new Date(Date.UTC(2026, 10, 15));
    const { sunrise, sunset } = getSunTimes(STOCKHOLM, date);
    const sunsetMs = Date.parse(sunset!);
    const sunriseMs = Date.parse(sunrise!);
    const nightStart = Math.ceil(sunsetMs / 3600_000) * 3600_000;
    const dayStart = Math.ceil(sunriseMs / 3600_000) * 3600_000;

    expect(isNight(new Date(nightStart - 3600_000).toISOString())).toBe(false);
    expect(isNight(new Date(nightStart).toISOString())).toBe(true);
    expect(isNight(new Date(dayStart - 3600_000).toISOString())).toBe(true);
    expect(isNight(new Date(dayStart).toISOString())).toBe(false);
  });

  it("is dark in the evening of a short winter day where the fixed rule would say day", () => {
    setDaylightLocation(STOCKHOLM);
    // Mid-December, ~18:00 local: well after the ~15:00 sunset in Stockholm.
    expect(isNight(localIso(2026, 11, 15, 18))).toBe(true);
  });

  it("is still day at 20:00-ish in midsummer where the fixed rule would say night", () => {
    setDaylightLocation(STOCKHOLM);
    expect(isNight(localIso(2026, 5, 21, 20))).toBe(false);
  });

  it("falls back to the fixed rule on a polar date with no sunrise/sunset", () => {
    setDaylightLocation({ latitude: 78.2, longitude: 15.6 }); // Svalbard, midsummer
    expect(isNight(localIso(2026, 5, 21, 12))).toBe(false);
    expect(isNight(localIso(2026, 5, 21, 23))).toBe(true);
  });
});
