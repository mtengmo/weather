import { describe, expect, it } from "vitest";
import { toDailyAggregates, toSubDayAndDailyBuckets } from "../../src/services/dailyAggregation";
import type { WeatherObservation } from "../../src/models/types";

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
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

describe("toSubDayAndDailyBuckets (014-dashboard-usability-fixes, US8)", () => {
  function daysAgo(d: number): string {
    // Midday, safely inside "today"'s afternoon window regardless of local test-run time.
    const date = new Date();
    date.setDate(date.getDate() - d);
    date.setHours(14, 0, 0, 0);
    return date.toISOString();
  }

  it("returns 5 sub-day buckets for today when there is no forecast data", () => {
    const result = toSubDayAndDailyBuckets([obs({ timestamp: daysAgo(3), temperature: 5 })], 7);
    const subDayBuckets = result.filter((b) => b.subDayLabel !== undefined);

    expect(subDayBuckets.map((b) => b.subDayLabel)).toEqual([
      "Morning",
      "Lunch",
      "Afternoon",
      "Evening",
      "Night",
    ]);
  });

  it("leaves days 3+ unaffected, identical to toDailyAggregates' own output", () => {
    const observations: WeatherObservation[] = [obs({ timestamp: daysAgo(3), temperature: 5 })];

    const subDayResult = toSubDayAndDailyBuckets(observations, 7);
    const plainResult = toDailyAggregates(observations, 7);

    const regularSubDayBuckets = subDayResult.filter((b) => b.subDayLabel === undefined);
    // toDailyAggregates' own last entry ("today") is replaced by 5 sub-day buckets, so compare
    // everything except that last entry. bucketEnd is omitted from the comparison: each call
    // computes it from its own Date.now() snapshot, which can drift by a millisecond between
    // the two calls above even though both mean "right now."
    expect(regularSubDayBuckets.map(({ bucketEnd: _bucketEnd, ...rest }) => rest)).toEqual(
      plainResult.slice(0, -1).map(({ bucketEnd: _bucketEnd, ...rest }) => rest)
    );
  });

  it("aggregates a sub-day bucket's own observations (high/low/average)", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: daysAgo(0), temperature: 10 }), // lands in the "Afternoon" window (14:00)
    ];

    const result = toSubDayAndDailyBuckets(observations, 7);
    const afternoon = result.find((b) => b.subDayLabel === "Afternoon");

    expect(afternoon?.high).toBe(10);
    expect(afternoon?.low).toBe(10);
    expect(afternoon?.average).toBe(10);
  });

  it("never fabricates a 'tomorrow' sub-day breakdown when no forecast reaches that far", () => {
    const result = toSubDayAndDailyBuckets([obs({ timestamp: daysAgo(1), temperature: 5 })], 7);
    const subDayBuckets = result.filter((b) => b.subDayLabel !== undefined);

    // Exactly one day's worth (5) of sub-day buckets — today only, no fabricated tomorrow.
    expect(subDayBuckets).toHaveLength(5);
  });

  it("always returns exactly bucketCount + 4 entries when there's no forecast (5 sub-day buckets replacing 1 daily bucket)", () => {
    const result = toSubDayAndDailyBuckets([], 7);
    expect(result).toHaveLength(7 + 4);
  });
});
