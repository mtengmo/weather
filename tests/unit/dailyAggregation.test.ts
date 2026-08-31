import { describe, expect, it } from "vitest";
import { toDailyAggregates } from "../../src/services/dailyAggregation";
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

  it("does not mutate the input array", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: hoursAgo(1), temperature: 10, precipitation: 1 }),
    ];
    const copy = JSON.parse(JSON.stringify(observations));

    toDailyAggregates(observations, 7);

    expect(observations).toEqual(copy);
  });
});
