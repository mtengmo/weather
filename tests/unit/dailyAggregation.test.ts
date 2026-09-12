import { describe, expect, it } from "vitest";
import { sumCalendarDayPrecipitation, toDailyAggregates, toSubDayBuckets } from "../../src/services/dailyAggregation";
import type { WeatherObservation } from "../../src/models/types";

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

// A timestamp at the given local-clock hour, guaranteed to fall within the most recent rolling
// 24h bucket (today at that hour, or yesterday at that hour if today's hasn't happened yet) —
// used to test the daytime-hour filter without depending on what time the test itself runs at.
function atLocalHour(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
  return d.toISOString();
}

function obs(partial: Partial<WeatherObservation> & { timestamp: string }): WeatherObservation {
  return {
    temperature: null,
    precipitation: null,
    windSpeed: null,
    cloudCoverPercent: null,
    ...partial,
  };
}

describe("toDailyAggregates", () => {
  it("always returns exactly bucketCount entries", () => {
    expect(toDailyAggregates([], 7)).toHaveLength(7);
    expect(toDailyAggregates([], 30)).toHaveLength(30);
  });

  it("returns all-null buckets for empty input", () => {
    const result = toDailyAggregates([], 7);
    for (const bucket of result) {
      expect(bucket.high).toBeNull();
      expect(bucket.low).toBeNull();
      expect(bucket.average).toBeNull();
      expect(bucket.totalPrecipitation).toBeNull();
      expect(bucket.windAverage).toBeNull();
      expect(bucket.cloudAverage).toBeNull();
      expect(bucket.windHigh).toBeNull();
      expect(bucket.windLow).toBeNull();
    }
  });

  it("computes high/low/average/total for a bucket with readings", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: hoursAgo(1), temperature: 10, precipitation: 1 }),
      obs({ timestamp: hoursAgo(2), temperature: 20, precipitation: 2 }),
      obs({ timestamp: hoursAgo(3), temperature: 15, precipitation: 3 }),
    ];

    const result = toDailyAggregates(observations, 7);
    const mostRecentBucket = result[result.length - 1]; // bucket 0 = most recent, sorted oldest->newest

    expect(mostRecentBucket.high).toBe(20);
    expect(mostRecentBucket.low).toBe(10);
    expect(mostRecentBucket.average).toBeCloseTo(15);
    expect(mostRecentBucket.totalPrecipitation).toBeCloseTo(6);
  });

  it("computes windAverage/cloudAverage independently of temperature/precipitation", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: hoursAgo(1), windSpeed: 4, cloudCoverPercent: 50 }),
      obs({ timestamp: hoursAgo(2), windSpeed: 6, cloudCoverPercent: 100 }),
    ];

    const result = toDailyAggregates(observations, 7);
    const mostRecentBucket = result[result.length - 1];

    expect(mostRecentBucket.windAverage).toBeCloseTo(5);
    expect(mostRecentBucket.cloudAverage).toBeCloseTo(75);
    // No temperature/precipitation readings in this bucket -> still null.
    expect(mostRecentBucket.average).toBeNull();
    expect(mostRecentBucket.totalPrecipitation).toBeNull();
  });

  it("computes windHigh/windLow for a bucket with readings, independent of other fields", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: hoursAgo(1), windSpeed: 4 }),
      obs({ timestamp: hoursAgo(2), windSpeed: 9 }),
      obs({ timestamp: hoursAgo(3), windSpeed: 2 }),
    ];

    const result = toDailyAggregates(observations, 7);
    const mostRecentBucket = result[result.length - 1];

    expect(mostRecentBucket.windHigh).toBe(9);
    expect(mostRecentBucket.windLow).toBe(2);
    expect(mostRecentBucket.windAverage).toBeCloseTo(5);
    // No temperature readings in this bucket -> still null, unaffected by wind.
    expect(mostRecentBucket.high).toBeNull();
    expect(mostRecentBucket.low).toBeNull();
  });

  it("takes the bucket's most recent non-null windDirection reading (018-dashboard-visual-redesign)", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: hoursAgo(3), windDirection: 90 }),
      obs({ timestamp: hoursAgo(2), windDirection: null }),
      obs({ timestamp: hoursAgo(1), windDirection: 270 }),
    ];

    const result = toDailyAggregates(observations, 7);
    const mostRecentBucket = result[result.length - 1];

    expect(mostRecentBucket.windDirection).toBe(270);
  });

  it("nulls windDirection when the bucket has no windDirection readings at all", () => {
    const observations: WeatherObservation[] = [obs({ timestamp: hoursAgo(1), temperature: 10 })];

    const result = toDailyAggregates(observations, 7);
    const mostRecentBucket = result[result.length - 1];

    expect(mostRecentBucket.windDirection).toBeNull();
  });

  describe("daytime-only fields (066-daily-forecast-language-setting)", () => {
    it("excludes night-hour (before 6 AM/after 8 PM) readings from the daytime fields, but keeps them in the whole-bucket fields", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: atLocalHour(3), temperature: 2, precipitation: 5, windSpeed: 10, cloudCoverPercent: 90 }),
        obs({ timestamp: atLocalHour(22), temperature: 1, precipitation: 4, windSpeed: 12, cloudCoverPercent: 95 }),
      ];

      const result = toDailyAggregates(observations, 7);
      const mostRecentBucket = result[result.length - 1];

      // Whole-bucket fields still reflect the night-only readings (unchanged behavior).
      expect(mostRecentBucket.totalPrecipitation).toBeCloseTo(9);
      expect(mostRecentBucket.average).toBeCloseTo(1.5);
      // Daytime fields see no daytime observations at all -> null.
      expect(mostRecentBucket.daytimeTotalPrecipitation).toBeNull();
      expect(mostRecentBucket.daytimeAverage).toBeNull();
      expect(mostRecentBucket.daytimeWindAverage).toBeNull();
      expect(mostRecentBucket.daytimeCloudAverage).toBeNull();
    });

    it("includes daytime-hour (6 AM-8 PM inclusive-exclusive) readings in the daytime fields", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: atLocalHour(3), temperature: 2, precipitation: 5 }), // night — excluded
        obs({ timestamp: atLocalHour(14), temperature: 18, precipitation: 1, windSpeed: 3, cloudCoverPercent: 20 }), // daytime — included
      ];

      const result = toDailyAggregates(observations, 7);
      const mostRecentBucket = result[result.length - 1];

      expect(mostRecentBucket.daytimeTotalPrecipitation).toBeCloseTo(1);
      expect(mostRecentBucket.daytimeAverage).toBeCloseTo(18);
      expect(mostRecentBucket.daytimeWindAverage).toBeCloseTo(3);
      expect(mostRecentBucket.daytimeCloudAverage).toBeCloseTo(20);
      // Whole-bucket fields still combine both readings.
      expect(mostRecentBucket.totalPrecipitation).toBeCloseTo(6);
    });

    it("treats the 6 AM and 8 PM boundary hours themselves as daytime", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: atLocalHour(6), precipitation: 2 }),
        obs({ timestamp: atLocalHour(19), precipitation: 3 }),
      ];

      const result = toDailyAggregates(observations, 7);
      const mostRecentBucket = result[result.length - 1];

      expect(mostRecentBucket.daytimeTotalPrecipitation).toBeCloseTo(5);
    });

    it("leaves every daytime field null when the bucket has no observations at all (fallback trigger)", () => {
      const result = toDailyAggregates([], 7);
      for (const bucket of result) {
        expect(bucket.daytimeAverage).toBeNull();
        expect(bucket.daytimeTotalPrecipitation).toBeNull();
        expect(bucket.daytimeWindAverage).toBeNull();
        expect(bucket.daytimeCloudAverage).toBeNull();
        expect(bucket.daytimeChanceOfRainMax).toBeNull();
      }
    });
  });

  describe("daytime rain-significance fields (067-fix-rain-brief-icons)", () => {
    it("counts a minority of rainy daytime hours and records the worst single hour's amount", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: atLocalHour(7), precipitation: 1 }), // rainy
        obs({ timestamp: atLocalHour(8), precipitation: 0.5 }), // rainy
        obs({ timestamp: atLocalHour(12), precipitation: 0 }), // dry
        obs({ timestamp: atLocalHour(14), precipitation: 0 }), // dry
        obs({ timestamp: atLocalHour(18), precipitation: 0 }), // dry
      ];

      const result = toDailyAggregates(observations, 7);
      const mostRecentBucket = result[result.length - 1];

      expect(mostRecentBucket.daytimeHourCount).toBe(5);
      expect(mostRecentBucket.daytimeRainHourCount).toBe(2);
      expect(mostRecentBucket.daytimeMaxHourlyPrecipitation).toBeCloseTo(1);
      // Whole-bucket total still reflects both rainy readings (unchanged behavior).
      expect(mostRecentBucket.totalPrecipitation).toBeCloseTo(1.5);
    });

    it("counts a majority of rainy daytime hours", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: atLocalHour(7), precipitation: 1 }),
        obs({ timestamp: atLocalHour(9), precipitation: 1 }),
        obs({ timestamp: atLocalHour(11), precipitation: 1 }),
        obs({ timestamp: atLocalHour(18), precipitation: 0 }),
      ];

      const result = toDailyAggregates(observations, 7);
      const mostRecentBucket = result[result.length - 1];

      expect(mostRecentBucket.daytimeHourCount).toBe(4);
      expect(mostRecentBucket.daytimeRainHourCount).toBe(3);
    });

    it("records a single heavy daytime hour's amount even when it's the only rainy hour", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: atLocalHour(7), precipitation: 6 }), // one heavy hour
        obs({ timestamp: atLocalHour(12), precipitation: 0 }),
        obs({ timestamp: atLocalHour(18), precipitation: 0 }),
      ];

      const result = toDailyAggregates(observations, 7);
      const mostRecentBucket = result[result.length - 1];

      expect(mostRecentBucket.daytimeHourCount).toBe(3);
      expect(mostRecentBucket.daytimeRainHourCount).toBe(1);
      expect(mostRecentBucket.daytimeMaxHourlyPrecipitation).toBeCloseTo(6);
    });

    it("leaves all three fields null together when no daytime observation has a precipitation reading", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: atLocalHour(3), precipitation: 5 }), // night — excluded from daytime entirely
      ];

      const result = toDailyAggregates(observations, 7);
      const mostRecentBucket = result[result.length - 1];

      expect(mostRecentBucket.daytimeHourCount).toBeNull();
      expect(mostRecentBucket.daytimeRainHourCount).toBeNull();
      expect(mostRecentBucket.daytimeMaxHourlyPrecipitation).toBeNull();
    });
  });

  it("nulls windHigh/windLow independently when the bucket has no wind readings", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: hoursAgo(1), temperature: 10 }),
    ];

    const result = toDailyAggregates(observations, 7);
    const mostRecentBucket = result[result.length - 1];

    expect(mostRecentBucket.windHigh).toBeNull();
    expect(mostRecentBucket.windLow).toBeNull();
    expect(mostRecentBucket.high).toBe(10);
  });

  it("nulls a bucket independently per field when only one field has readings", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: hoursAgo(1), temperature: 10, precipitation: null }),
    ];

    const result = toDailyAggregates(observations, 7);
    const mostRecentBucket = result[result.length - 1];

    expect(mostRecentBucket.high).toBe(10);
    expect(mostRecentBucket.totalPrecipitation).toBeNull();
  });

  it("places observations into distinct oldest/newest buckets correctly", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: hoursAgo(1), temperature: 5, precipitation: 0 }), // most recent bucket
      obs({ timestamp: hoursAgo(167), temperature: 25, precipitation: 0 }), // oldest bucket
    ];

    const result = toDailyAggregates(observations, 7);

    expect(result[0].high).toBe(25); // oldest bucket first
    expect(result[result.length - 1].high).toBe(5); // most recent bucket last
  });

  it("does not extend past bucketCount when there is no forecast data (unchanged length)", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: hoursAgo(1), temperature: 10 }),
    ];
    expect(toDailyAggregates(observations, 7)).toHaveLength(7);
  });

  describe("forecast buckets (005-add-weather-forecast)", () => {
    function hoursFromNow(h: number): string {
      return new Date(Date.now() + h * 3600_000).toISOString();
    }

    it("marks a bucket entirely in the future as isForecast: true", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: hoursFromNow(5), temperature: 20, isForecast: true }),
      ];

      const result = toDailyAggregates(observations, 7);
      const forecastBucket = result[result.length - 1]; // newest = the appended future bucket

      expect(forecastBucket.isForecast).toBe(true);
      expect(forecastBucket.high).toBe(20);
    });

    it("does not mark a past bucket as forecast", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: hoursAgo(1), temperature: 10 }),
      ];

      const result = toDailyAggregates(observations, 7);
      const mostRecentPastBucket = result[result.length - 1];

      expect(mostRecentPastBucket.isForecast).toBeUndefined();
    });

    it("extends only as far as the forecast data actually reaches (no fabricated days)", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: hoursAgo(1), temperature: 10 }),
        obs({ timestamp: hoursFromNow(20), temperature: 15, isForecast: true }), // 1 forecast day only
      ];

      const result = toDailyAggregates(observations, 7);

      // 7 past-window buckets + exactly 1 forecast bucket, not more.
      expect(result).toHaveLength(8);
      expect(result[result.length - 1].isForecast).toBe(true);
      expect(result[result.length - 2].isForecast).toBeUndefined();
    });

    it("bridges observed and forecast buckets that straddle 'now' into adjacent output entries", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: hoursAgo(1), temperature: 8 }), // most recent past bucket
        obs({ timestamp: hoursFromNow(1), temperature: 9, isForecast: true }), // first future bucket
      ];

      const result = toDailyAggregates(observations, 7);

      expect(result[result.length - 2].isForecast).toBeUndefined();
      expect(result[result.length - 2].high).toBe(8);
      expect(result[result.length - 1].isForecast).toBe(true);
      expect(result[result.length - 1].high).toBe(9);
    });
  });

  describe("chanceOfRainMax (011-precipitation-chance)", () => {
    function hoursFromNow(h: number): string {
      return new Date(Date.now() + h * 3600_000).toISOString();
    }

    it("takes the bucket's forecast-only maximum chanceOfRain reading", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: hoursFromNow(1), temperature: 9, isForecast: true, chanceOfRain: 20 }),
        obs({ timestamp: hoursFromNow(2), temperature: 10, isForecast: true, chanceOfRain: 70 }),
        obs({ timestamp: hoursFromNow(3), temperature: 11, isForecast: true, chanceOfRain: 40 }),
      ];

      const result = toDailyAggregates(observations, 7);
      const forecastBucket = result[result.length - 1];

      expect(forecastBucket.chanceOfRainMax).toBe(70);
    });

    it("ignores non-forecast (observed) chanceOfRain readings", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: hoursAgo(1), temperature: 8, chanceOfRain: 90 }), // observed, not forecast
      ];

      const result = toDailyAggregates(observations, 7);
      const mostRecentBucket = result[result.length - 1];

      expect(mostRecentBucket.chanceOfRainMax).toBeNull();
    });

    it("is null when the bucket has no chanceOfRain readings at all", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: hoursFromNow(1), temperature: 9, isForecast: true }),
      ];

      const result = toDailyAggregates(observations, 7);
      const forecastBucket = result[result.length - 1];

      expect(forecastBucket.chanceOfRainMax).toBeNull();
    });

    it("preserves a genuine 0 reading rather than treating it as absent", () => {
      const observations: WeatherObservation[] = [
        obs({ timestamp: hoursFromNow(1), temperature: 9, isForecast: true, chanceOfRain: 0 }),
      ];

      const result = toDailyAggregates(observations, 7);
      const forecastBucket = result[result.length - 1];

      expect(forecastBucket.chanceOfRainMax).toBe(0);
    });
  });

  it("does not mutate the input array", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: hoursAgo(1), temperature: 10, precipitation: 1 }),
    ];
    const copy = JSON.parse(JSON.stringify(observations));

    toDailyAggregates(observations, 7);

    expect(observations).toEqual(copy);
  });
});

describe("toSubDayBuckets (015-overview-3day-resolution-fix)", () => {
  function daysFromNow(d: number): string {
    // Midday, safely inside that day's afternoon window regardless of local test-run time.
    const date = new Date();
    date.setDate(date.getDate() + d);
    date.setHours(14, 0, 0, 0);
    return date.toISOString();
  }

  // Day buckets here are rolling 24h windows from "now" (matching toDailyAggregates' own
  // documented convention), not calendar dates — daysFromNow's fixed "tomorrow at 14:00" can
  // drift into the next rolling bucket depending on the current wall-clock time (e.g. it lands
  // more than 24h out whenever the suite runs before 14:00 local). Used only where the test
  // asserts an exact day-index classification; offset from "now" itself instead of a wall-clock
  // hour keeps it robustly mid-bucket regardless of when the suite runs.
  function midRollingDayFromNow(d: number): string {
    return new Date(Date.now() + d * 24 * 3600_000 - 12 * 3600_000).toISOString();
  }

  it("includes an early-morning (00:00-06:00) observation on the first rendered day in its Morning bucket (020-dashboard-polish-round-five, US1)", () => {
    // The first rendered day is now dayCount-1 days back (026-fix-3-day follow-up), so the
    // widened Morning window belongs to that earliest day, not to today.
    const earlyMorning = new Date(Date.now() - 2 * 24 * 3600_000);
    earlyMorning.setHours(3, 0, 0, 0);
    const result = toSubDayBuckets([obs({ timestamp: earlyMorning.toISOString(), temperature: 7 })], 3);

    const firstDayMorning = result[0];
    expect(firstDayMorning.subDayLabel).toBe("Morning");
    expect(firstDayMorning.high).toBe(7);
    expect(firstDayMorning.low).toBe(7);
  });

  it("leaves a later rendered day's own Morning boundary at 6am, unaffected by the first-day widening", () => {
    // One day after the first rendered day (i.e. dayCount-2 days back).
    const secondDayEarlyMorning = new Date(Date.now() - 1 * 24 * 3600_000);
    secondDayEarlyMorning.setHours(3, 0, 0, 0);
    const result = toSubDayBuckets(
      [obs({ timestamp: secondDayEarlyMorning.toISOString(), temperature: 9 })],
      3
    );

    // The second rendered day's own 00:00-06:00 is covered by the first day's Night period (which
    // reaches 6h into it), not by its own Morning — confirming only the first day is widened.
    const firstDayNight = result[4]; // first day's 5 periods: Morning, Lunch, Afternoon, Evening, Night
    const secondDayMorning = result[5];
    expect(firstDayNight.subDayLabel).toBe("Night");
    expect(secondDayMorning.subDayLabel).toBe("Morning");
    expect(firstDayNight.high).toBe(9);
    expect(secondDayMorning.high).toBeNull();
  });

  it("returns the past dayCount days' buckets when there is no forecast data (026-fix-3-day follow-up)", () => {
    const result = toSubDayBuckets([], 3);
    // 3 past days (including today) x 5 periods, with no forward extension.
    expect(result).toHaveLength(15);
    expect(result.slice(0, 5).map((b) => b.subDayLabel)).toEqual([
      "Morning",
      "Lunch",
      "Afternoon",
      "Evening",
      "Night",
    ]);
  });

  it("adds one forward day's buckets when forecast reaches 1 day out", () => {
    const result = toSubDayBuckets([obs({ timestamp: midRollingDayFromNow(1), temperature: 5, isForecast: true })], 3);
    expect(result).toHaveLength(20); // 3 past days + 1 forward day
  });

  it("adds two forward days' buckets when forecast reaches 2 days out", () => {
    const result = toSubDayBuckets([obs({ timestamp: midRollingDayFromNow(2), temperature: 5, isForecast: true })], 3);
    expect(result).toHaveLength(25); // 3 past days + 2 forward days
  });

  it("extends as far forward as the forecast actually reaches (capping is the caller's job)", () => {
    const result = toSubDayBuckets([obs({ timestamp: daysFromNow(6), temperature: 5, isForecast: true })], 3);
    // 3 past days + however many forward days the data reaches — build3DayTimelineData applies the
    // forecast-reach cap itself, mirroring the 7-day view (026-fix-3-day follow-up).
    expect(result.length).toBeGreaterThan(15);
    expect(result.length % 5).toBe(0);
  });

  it("aggregates a sub-day bucket's own observations (high/low/average)", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: daysFromNow(0), temperature: 10 }), // lands in today's "Afternoon" window (14:00)
    ];

    const result = toSubDayBuckets(observations, 3);
    // Today is the LAST of the three past days, so its Afternoon is the third day's third period.
    const afternoon = result.filter((b) => b.subDayLabel === "Afternoon")[2];

    expect(afternoon?.high).toBe(10);
    expect(afternoon?.low).toBe(10);
    expect(afternoon?.average).toBe(10);
  });

  it("returns a single day's 5 entries when dayCount is 1 and there is no forecast", () => {
    const result = toSubDayBuckets([], 1);
    expect(result).toHaveLength(5);
  });
});

describe("sumCalendarDayPrecipitation (033-todays-rain-total)", () => {
  // A fixed reference time (14:00 local, an arbitrary day) rather than the real system clock —
  // avoids any flakiness from a test happening to run near real midnight.
  const reference = new Date(2026, 5, 15, 14, 0, 0);

  function atLocalHour(hour: number): string {
    const d = new Date(reference);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }

  function nextDayAtLocalHour(hour: number): string {
    const d = new Date(reference);
    d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }

  it("sums both already-elapsed and still-forecast hours of today into one total", () => {
    const observations = [
      obs({ timestamp: atLocalHour(9), precipitation: 1 }), // elapsed (before 14:00)
      obs({ timestamp: atLocalHour(18), precipitation: 2, isForecast: true }), // still ahead
    ];

    expect(sumCalendarDayPrecipitation(observations, reference)).toBe(3);
  });

  it("excludes an hour belonging to tomorrow, even late at night", () => {
    const lateReference = new Date(reference);
    lateReference.setHours(23, 30, 0, 0);
    const observations = [
      obs({ timestamp: atLocalHour(22), precipitation: 1 }),
      obs({ timestamp: nextDayAtLocalHour(1), precipitation: 5, isForecast: true }), // tomorrow
    ];

    expect(sumCalendarDayPrecipitation(observations, lateReference)).toBe(1);
  });

  it("returns null, not 0, when there is no non-null reading anywhere in today's span", () => {
    const observations = [
      obs({ timestamp: atLocalHour(9), precipitation: null }),
      obs({ timestamp: nextDayAtLocalHour(9), precipitation: 5 }), // tomorrow — irrelevant
    ];

    expect(sumCalendarDayPrecipitation(observations, reference)).toBeNull();
    expect(sumCalendarDayPrecipitation([], reference)).toBeNull();
  });
});
