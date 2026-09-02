import { describe, expect, it } from "vitest";
import { buildDailyTimelineData, buildHourlyTimelineData } from "../../src/components/timelineData";
import type { ObservationSeries, WeatherObservation } from "../../src/models/types";

const LOCATION = { latitude: 59.33, longitude: 18.07, displayName: "Stockholm", source: "favorite" as const };

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3600_000).toISOString();
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

function series(observations: WeatherObservation[]): ObservationSeries {
  return { location: LOCATION, window: "last-24-hours", observations, status: "ready" };
}

describe("buildHourlyTimelineData", () => {
  it("flags gap points as null rather than fabricating zero", () => {
    const data = buildHourlyTimelineData(
      series([obs({ timestamp: hoursFromNow(-1), temperature: null, precipitation: null })]),
      "metric"
    );
    expect(data.temperature.points[0].value).toBeNull();
    expect(data.precipitation.points[0].value).toBeNull();
  });

  it("passes isForecast through unchanged onto every row's points", () => {
    const data = buildHourlyTimelineData(
      series([
        obs({ timestamp: hoursFromNow(-1), temperature: 10, isForecast: false }),
        obs({ timestamp: hoursFromNow(1), temperature: 12, isForecast: true }),
      ]),
      "metric"
    );
    expect(data.temperature.points[0].isForecast).toBe(false);
    expect(data.temperature.points[1].isForecast).toBe(true);
    expect(data.periods[0].isForecast).toBe(false);
    expect(data.periods[1].isForecast).toBe(true);
  });

  it("converts values per the unit argument", () => {
    const data = buildHourlyTimelineData(
      series([obs({ timestamp: hoursFromNow(-1), temperature: 0, windSpeed: 10 })]),
      "imperial"
    );
    expect(data.temperature.points[0].value).toBe(32);
    expect(data.wind.points[0].value).toBeCloseTo(22.3694, 3);
  });

  it("computes nowBoundaryIndex as the last observed index before the first forecast point", () => {
    const data = buildHourlyTimelineData(
      series([
        obs({ timestamp: hoursFromNow(-2), temperature: 5, isForecast: false }),
        obs({ timestamp: hoursFromNow(-1), temperature: 6, isForecast: false }),
        obs({ timestamp: hoursFromNow(1), temperature: 7, isForecast: true }),
      ]),
      "metric"
    );
    expect(data.nowBoundaryIndex).toBe(1);
  });

  it("returns null nowBoundaryIndex when there is no forecast data", () => {
    const data = buildHourlyTimelineData(
      series([obs({ timestamp: hoursFromNow(-1), temperature: 5 })]),
      "metric"
    );
    expect(data.nowBoundaryIndex).toBeNull();
  });

  it("marks a row unavailable when every point lacks that field, and available when at least one has it", () => {
    const noGust = buildHourlyTimelineData(
      series([obs({ timestamp: hoursFromNow(-1), temperature: 5, windGust: null })]),
      "metric"
    );
    expect(noGust.gust.available).toBe(false);

    const withGust = buildHourlyTimelineData(
      series([obs({ timestamp: hoursFromNow(-1), temperature: 5, windGust: 12 })]),
      "metric"
    );
    expect(withGust.gust.available).toBe(true);
  });

  it("core rows (temperature, precipitation, wind, cloud) stay available even when entirely gapped", () => {
    const data = buildHourlyTimelineData(series([obs({ timestamp: hoursFromNow(-1) })]), "metric");
    expect(data.temperature.available).toBe(true);
    expect(data.precipitation.available).toBe(true);
    expect(data.wind.available).toBe(true);
    expect(data.cloud.available).toBe(true);
  });

  it("only includes a snow value when the point is classified snowy", () => {
    const data = buildHourlyTimelineData(
      series([
        obs({
          timestamp: hoursFromNow(-1),
          temperature: -5,
          precipitation: 2,
          windSpeed: 1,
          cloudCoverPercent: 90,
        }),
      ]),
      "metric"
    );
    expect(data.snow.available).toBe(true);
    expect(data.snow.points[0].value).toBe(2);
  });

  describe("precipitation row chanceOfRain (011-precipitation-chance)", () => {
    it("passes chanceOfRain through for a forecast point with data", () => {
      const data = buildHourlyTimelineData(
        series([obs({ timestamp: hoursFromNow(1), precipitation: 2, isForecast: true, chanceOfRain: 70 })]),
        "metric"
      );
      expect(data.precipitation.points[0].chanceOfRain).toBe(70);
    });

    it("is null for a forecast point without chanceOfRain data", () => {
      const data = buildHourlyTimelineData(
        series([obs({ timestamp: hoursFromNow(1), precipitation: 2, isForecast: true })]),
        "metric"
      );
      expect(data.precipitation.points[0].chanceOfRain).toBeNull();
    });

    it("is null for an observed point even when the underlying source value is non-null", () => {
      const data = buildHourlyTimelineData(
        series([
          obs({ timestamp: hoursFromNow(-1), precipitation: 2, isForecast: false, chanceOfRain: 90 }),
        ]),
        "metric"
      );
      expect(data.precipitation.points[0].chanceOfRain).toBeNull();
    });

    it("preserves a genuine 0 reading on a forecast point rather than treating it as absent", () => {
      const data = buildHourlyTimelineData(
        series([obs({ timestamp: hoursFromNow(1), precipitation: 0, isForecast: true, chanceOfRain: 0 })]),
        "metric"
      );
      expect(data.precipitation.points[0].chanceOfRain).toBe(0);
    });
  });
});

describe("buildDailyTimelineData", () => {
  it("does not fabricate forecast days beyond what toDailyAggregates returns", () => {
    const data = buildDailyTimelineData(series([obs({ timestamp: hoursFromNow(-1), temperature: 5 })]), "metric");
    expect(data.periods.some((p) => p.isForecast)).toBe(false);
  });

  it("sets windDirection to null for every daily wind point", () => {
    const data = buildDailyTimelineData(
      series([obs({ timestamp: hoursFromNow(-1), windSpeed: 5, windDirection: 90 })]),
      "metric"
    );
    expect(data.wind.points.every((p) => p.direction === null)).toBe(true);
  });

  it("reflects the day's chanceOfRainMax on the precipitation row (011-precipitation-chance)", () => {
    const data = buildDailyTimelineData(
      series([
        obs({
          timestamp: hoursFromNow(25),
          temperature: 9,
          precipitation: 1,
          isForecast: true,
          chanceOfRain: 65,
        }),
      ]),
      "metric"
    );
    const forecastPoint = data.precipitation.points[data.precipitation.points.length - 1];
    expect(forecastPoint.chanceOfRain).toBe(65);
  });
});
