import { describe, expect, it } from "vitest";
import {
  build3DayTimelineData,
  buildDailyTimelineData,
  buildHourlyTimelineData,
  mergeMultiSourceIntoTimelinePoints,
} from "../../src/components/timelineData";
import type { ObservationSeries, WeatherObservation } from "../../src/models/types";
import type { MultiSourceForecastEntry } from "../../src/services/weatherApi";

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

  it("core rows (temperature, precipitation, wind, snow) stay available even when entirely gapped", () => {
    const data = buildHourlyTimelineData(series([obs({ timestamp: hoursFromNow(-1) })]), "metric");
    expect(data.temperature.available).toBe(true);
    expect(data.precipitation.available).toBe(true);
    expect(data.wind.available).toBe(true);
  });

  describe("wind row gust (009-timeline-polish-and-header)", () => {
    it("carries a null gust when the source has none", () => {
      const data = buildHourlyTimelineData(
        series([obs({ timestamp: hoursFromNow(-1), temperature: 5, windSpeed: 3, windGust: null })]),
        "metric"
      );
      expect(data.wind.points[0].gust).toBeNull();
    });

    it("carries the converted gust value when the source has one", () => {
      const data = buildHourlyTimelineData(
        series([obs({ timestamp: hoursFromNow(-1), temperature: 5, windSpeed: 3, windGust: 12 })]),
        "metric"
      );
      expect(data.wind.points[0].gust).toBe(12);
    });
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

  describe("locale-independent hour label (009-timeline-polish-and-header, FR-010)", () => {
    it("renders a plain 2-digit 24-hour label with no AM/PM marker", () => {
      const data = buildHourlyTimelineData(
        series([obs({ timestamp: hoursFromNow(-1), temperature: 5 })]),
        "metric"
      );
      expect(data.periods[0].label).toMatch(/^\d{2}$/);
      expect(data.periods[0].label).not.toMatch(/AM|PM/i);
    });
  });

  describe("now-boundary interpolation (009-timeline-polish-and-header, FR-012/FR-013)", () => {
    it("interpolates the boundary column's value as the midpoint of its neighbors when both are present", () => {
      const data = buildHourlyTimelineData(
        series([
          obs({ timestamp: hoursFromNow(-1), temperature: 10, isForecast: false }),
          obs({ timestamp: hoursFromNow(1), temperature: null, isForecast: true }),
          obs({ timestamp: hoursFromNow(2), temperature: 20, isForecast: true }),
        ]),
        "metric"
      );
      expect(data.nowBoundaryIndex).toBe(0);
      expect(data.temperature.points[1].value).toBe(15);
      expect(data.temperature.points[1].interpolated).toBe(true);
    });

    it("leaves the boundary column as a gap when the observed neighbor is missing", () => {
      const data = buildHourlyTimelineData(
        series([
          obs({ timestamp: hoursFromNow(-1), temperature: null, isForecast: false }),
          obs({ timestamp: hoursFromNow(1), temperature: null, isForecast: true }),
          obs({ timestamp: hoursFromNow(2), temperature: 20, isForecast: true }),
        ]),
        "metric"
      );
      expect(data.temperature.points[1].value).toBeNull();
      expect(data.temperature.points[1].interpolated).toBeFalsy();
    });

    it("leaves the boundary column as a gap when the forecast neighbor is missing", () => {
      const data = buildHourlyTimelineData(
        series([
          obs({ timestamp: hoursFromNow(-1), temperature: 10, isForecast: false }),
          obs({ timestamp: hoursFromNow(1), temperature: null, isForecast: true }),
          obs({ timestamp: hoursFromNow(2), temperature: null, isForecast: true }),
        ]),
        "metric"
      );
      expect(data.temperature.points[1].value).toBeNull();
      expect(data.temperature.points[1].interpolated).toBeFalsy();
    });

    it("leaves the boundary column as a gap when there is no forecast neighbor at all", () => {
      const data = buildHourlyTimelineData(
        series([
          obs({ timestamp: hoursFromNow(-1), temperature: 10, isForecast: false }),
          obs({ timestamp: hoursFromNow(1), temperature: null, isForecast: true }),
        ]),
        "metric"
      );
      expect(data.temperature.points[1].value).toBeNull();
      expect(data.temperature.points[1].interpolated).toBeFalsy();
    });

    it("does not interpolate in the daily builder", () => {
      const data = buildDailyTimelineData(
        series([
          obs({ timestamp: hoursFromNow(-1), temperature: 10, isForecast: false }),
          obs({ timestamp: hoursFromNow(25), temperature: null, isForecast: true }),
          obs({ timestamp: hoursFromNow(49), temperature: 20, isForecast: true }),
        ]),
        "metric"
      );
      expect(data.temperature.points.every((p) => !p.interpolated)).toBe(true);
    });
  });
});

describe("buildDailyTimelineData", () => {
  it("does not fabricate forecast days beyond what toDailyAggregates returns", () => {
    const data = buildDailyTimelineData(series([obs({ timestamp: hoursFromNow(-1), temperature: 5 })]), "metric");
    expect(data.periods.some((p) => p.isForecast)).toBe(false);
  });

  it("always returns exactly one column per day, all weekday-labeled — never a sub-day column (015-overview-3day-resolution-fix, FR-001/FR-002)", () => {
    const data = buildDailyTimelineData(
      series([obs({ timestamp: hoursFromNow(-1), temperature: 5, isForecast: false })]),
      "metric"
    );
    const subDayLabels = ["Morning", "Lunch", "Afternoon", "Evening", "Night"];
    expect(data.periods).toHaveLength(7);
    expect(data.periods.every((p) => !subDayLabels.includes(p.label))).toBe(true);
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

describe("build3DayTimelineData (015-overview-3day-resolution-fix, US2/US3)", () => {
  it("labels every period with a sub-day name, never a weekday", () => {
    const data = build3DayTimelineData(series([obs({ timestamp: hoursFromNow(-1), temperature: 5 })]), "metric");
    const subDayLabels = ["Morning", "Lunch", "Afternoon", "Evening", "Night"];
    expect(data.periods.length).toBeGreaterThan(0);
    expect(data.periods.every((p) => subDayLabels.includes(p.label))).toBe(true);
  });

  it("never returns more than 15 periods (3 days x 5 sub-day periods)", () => {
    const data = build3DayTimelineData(
      series([obs({ timestamp: hoursFromNow(24 * 6), temperature: 5, isForecast: true })]),
      "metric"
    );
    expect(data.periods.length).toBeLessThanOrEqual(15);
  });

  it("carries high/low onto a sub-day temperature point the same way a daily point does (015, FR-007)", () => {
    const data = build3DayTimelineData(series([obs({ timestamp: hoursFromNow(-1), temperature: 5 })]), "metric");
    const populatedPoint = data.temperature.points.find((p) => p.value !== null);

    expect(populatedPoint?.high).not.toBeUndefined();
    expect(populatedPoint?.low).not.toBeUndefined();
  });

  it("does not fabricate a day beyond what the observations' forecast actually reaches", () => {
    const data = build3DayTimelineData(series([obs({ timestamp: hoursFromNow(-1), temperature: 5 })]), "metric");
    // No forecast at all — only "today"'s 5 sub-day periods should exist.
    expect(data.periods).toHaveLength(5);
  });
});

describe("mergeMultiSourceIntoTimelinePoints (016-dashboard-polish-round-two, US2)", () => {
  function forecastObs(timestamp: string, temperature: number): WeatherObservation {
    return obs({ timestamp, temperature, isForecast: true });
  }

  it("populates sources on a forecast period when 2+ sources have data for it", () => {
    const t = hoursFromNow(1);
    const data = buildHourlyTimelineData(series([forecastObs(t, 10)]), "metric");
    const entries: MultiSourceForecastEntry[] = [
      { source: "smhi", observations: [forecastObs(t, 8)] },
      { source: "open-meteo", observations: [forecastObs(t, 12)] },
    ];

    mergeMultiSourceIntoTimelinePoints(data.temperature, data.periods, entries, "metric");

    const point = data.temperature.points[0];
    expect(point.sources).toEqual([
      { label: "S", value: 8 },
      { label: "O", value: 12 },
    ]);
  });

  it("does nothing with fewer than 2 sources", () => {
    const t = hoursFromNow(1);
    const data = buildHourlyTimelineData(series([forecastObs(t, 10)]), "metric");
    const entries: MultiSourceForecastEntry[] = [{ source: "smhi", observations: [forecastObs(t, 8)] }];

    mergeMultiSourceIntoTimelinePoints(data.temperature, data.periods, entries, "metric");

    expect(data.temperature.points[0].sources).toBeUndefined();
  });

  it("never populates sources on an observed period", () => {
    const past = hoursFromNow(-1);
    const future = hoursFromNow(1);
    const data = buildHourlyTimelineData(
      series([obs({ timestamp: past, temperature: 5 }), forecastObs(future, 10)]),
      "metric"
    );
    const entries: MultiSourceForecastEntry[] = [
      { source: "smhi", observations: [forecastObs(future, 8)] },
      { source: "open-meteo", observations: [forecastObs(future, 12)] },
    ];

    mergeMultiSourceIntoTimelinePoints(data.temperature, data.periods, entries, "metric");

    expect(data.temperature.points[0].sources).toBeUndefined(); // observed period
    expect(data.temperature.points[1].sources).toBeDefined(); // forecast period
  });

  it("converts each source's value to the requested unit", () => {
    const t = hoursFromNow(1);
    const data = buildHourlyTimelineData(series([forecastObs(t, 10)]), "imperial");
    const entries: MultiSourceForecastEntry[] = [
      { source: "smhi", observations: [forecastObs(t, 0)] },
      { source: "open-meteo", observations: [forecastObs(t, 0)] },
    ];

    mergeMultiSourceIntoTimelinePoints(data.temperature, data.periods, entries, "imperial");

    expect(data.temperature.points[0].sources?.[0].value).toBe(32);
  });

  it("leaves a forecast period untouched when fewer than 2 sources have data at its own time span", () => {
    const t = hoursFromNow(1);
    const otherT = hoursFromNow(5);
    const data = buildHourlyTimelineData(series([forecastObs(t, 10)]), "metric");
    const entries: MultiSourceForecastEntry[] = [
      { source: "smhi", observations: [forecastObs(otherT, 8)] },
      { source: "open-meteo", observations: [forecastObs(otherT, 12)] },
    ];

    mergeMultiSourceIntoTimelinePoints(data.temperature, data.periods, entries, "metric");

    expect(data.temperature.points[0].sources).toBeUndefined();
  });
});
