import { describe, expect, it } from "vitest";
import {
  buildDailyRows,
  buildHourlyRows,
  buildMetricDailyRows,
  buildMetricHourlyRows,
  buildWindDailyRows,
  findObservedExtremes,
  forecastBoundaryValue,
  forecastKey,
  isMetricAvailable,
  seriesKey,
} from "../../src/components/chartData";
import type {
  DailyAggregate,
  NearbyStationSeries,
  ObservationSeries,
  WeatherObservation,
} from "../../src/models/types";

function obs(partial: Partial<WeatherObservation> & { timestamp: string }): WeatherObservation {
  return {
    temperature: null,
    precipitation: null,
    windSpeed: null,
    cloudCoverPercent: null,
    ...partial,
  };
}

function primarySeries(observations: WeatherObservation[]): ObservationSeries {
  return {
    location: { latitude: 1, longitude: 1, displayName: "Primary", source: "current-position" },
    window: "last-24-hours",
    observations,
    status: "ready",
  };
}

function nearby(id: string, observations: WeatherObservation[]): NearbyStationSeries {
  return {
    station: { id, displayName: `Station ${id}`, distanceKm: 1, latitude: 1, longitude: 1 },
    series: primarySeries(observations),
  };
}

describe("buildMetricHourlyRows", () => {
  it("builds primary + nearby rows for the wind metric, converted to the requested unit", () => {
    const t = "2026-08-31T10:00:00Z";
    const primary = primarySeries([obs({ timestamp: t, windSpeed: 10 })]);
    const stations = [nearby("a", [obs({ timestamp: t, windSpeed: 5 })])];

    const metricRows = buildMetricHourlyRows(primary, stations, "metric", "wind");
    expect(metricRows[0][seriesKey(0)]).toBe(10);
    expect(metricRows[0][seriesKey(1)]).toBe(5);

    const imperialRows = buildMetricHourlyRows(primary, stations, "imperial", "wind");
    expect(imperialRows[0][seriesKey(0)]).toBeCloseTo(10 * 2.23694);
  });

  it("does not convert cloud coverage (already a percentage)", () => {
    const t = "2026-08-31T10:00:00Z";
    const primary = primarySeries([obs({ timestamp: t, cloudCoverPercent: 62.5 })]);

    const rows = buildMetricHourlyRows(primary, [], "imperial", "cloud");
    expect(rows[0][seriesKey(0)]).toBe(62.5);
  });
});

describe("buildMetricHourlyRows — rain (User Story 3: comparison-station values)", () => {
  it("includes each nearby station's precipitation value under its own series key", () => {
    const t = "2026-08-31T10:00:00Z";
    const primary = primarySeries([obs({ timestamp: t, precipitation: 1.2 })]);
    const stations = [
      nearby("a", [obs({ timestamp: t, precipitation: 0.4 })]),
      nearby("b", [obs({ timestamp: t, precipitation: 2.1 })]),
    ];

    const rows = buildMetricHourlyRows(primary, stations, "metric", "rain");

    expect(rows[0][seriesKey(0)]).toBeCloseTo(1.2);
    expect(rows[0][seriesKey(1)]).toBeCloseTo(0.4);
    expect(rows[0][seriesKey(2)]).toBeCloseTo(2.1);
  });
});

describe("buildMetricDailyRows", () => {
  it("builds primary + nearby daily-average rows for the requested bucket count", () => {
    const primary = primarySeries([
      obs({ timestamp: new Date(Date.now() - 3600_000).toISOString(), windSpeed: 8 }),
    ]);

    const rows = buildMetricDailyRows(primary, [], "metric", "wind", 7);
    expect(rows).toHaveLength(7);
    expect(rows[rows.length - 1][seriesKey(0)]).toBeCloseTo(8);
  });
});

describe("buildDailyRows (regression after the shared high/low/average refactor)", () => {
  it("still produces primaryHigh/primaryLow/primaryAverage/primaryPrecipitation from temperature/precipitation fields", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: new Date(Date.now() - 3600_000).toISOString(), temperature: 20, precipitation: 1 }),
      obs({ timestamp: new Date(Date.now() - 2 * 3600_000).toISOString(), temperature: 10, precipitation: 2 }),
    ];
    const primary = primarySeries(observations);
    const stations = [
      nearby("a", [
        obs({ timestamp: new Date(Date.now() - 3600_000).toISOString(), temperature: 15 }),
      ]),
    ];

    const rows = buildDailyRows(primary, stations, "metric", 7);
    const mostRecentRow = rows[rows.length - 1];

    expect(mostRecentRow.primaryHigh).toBe(20);
    expect(mostRecentRow.primaryLow).toBe(10);
    expect(mostRecentRow.primaryAverage).toBeCloseTo(15);
    expect(mostRecentRow.primaryPrecipitation).toBeCloseTo(3);
    expect(mostRecentRow[seriesKey(1)]).toBe(15);
  });
});

describe("buildWindDailyRows (User Story 4: reuses the temperature high/low/average setup)", () => {
  it("builds primaryHigh/primaryLow/primaryAverage from windHigh/windLow/windAverage, unit-converted", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: new Date(Date.now() - 3600_000).toISOString(), windSpeed: 9 }),
      obs({ timestamp: new Date(Date.now() - 2 * 3600_000).toISOString(), windSpeed: 3 }),
    ];
    const primary = primarySeries(observations);

    const metricRows = buildWindDailyRows(primary, [], "metric", 7);
    const mostRecentMetricRow = metricRows[metricRows.length - 1];
    expect(mostRecentMetricRow.primaryHigh).toBe(9);
    expect(mostRecentMetricRow.primaryLow).toBe(3);
    expect(mostRecentMetricRow.primaryAverage).toBeCloseTo(6);

    const imperialRows = buildWindDailyRows(primary, [], "imperial", 7);
    const mostRecentImperialRow = imperialRows[imperialRows.length - 1];
    expect(mostRecentImperialRow.primaryHigh).toBeCloseTo(9 * 2.23694);
  });

  it("includes each nearby station's wind average (not its own high/low)", () => {
    const t = new Date(Date.now() - 3600_000).toISOString();
    const primary = primarySeries([obs({ timestamp: t, windSpeed: 5 })]);
    const stations = [nearby("a", [obs({ timestamp: t, windSpeed: 7 })])];

    const rows = buildWindDailyRows(primary, stations, "metric", 7);
    expect(rows[rows.length - 1][seriesKey(1)]).toBe(7);
  });
});

describe("forecast continuation (005-add-weather-forecast)", () => {
  function hoursFromNow(h: number): string {
    return new Date(Date.now() + h * 3600_000).toISOString();
  }

  it("buildHourlyRows: forecast key is null before the boundary and populated from the boundary point onward, with the boundary point duplicated into both keys", () => {
    const observations = [
      { timestamp: hoursFromNow(-1), temperature: 10, precipitation: 1, windSpeed: null, cloudCoverPercent: null },
      { timestamp: hoursFromNow(0), temperature: 12, precipitation: 2, windSpeed: null, cloudCoverPercent: null }, // boundary: last observed
      { timestamp: hoursFromNow(1), temperature: 14, precipitation: 3, windSpeed: null, cloudCoverPercent: null, isForecast: true },
      { timestamp: hoursFromNow(2), temperature: 16, precipitation: 4, windSpeed: null, cloudCoverPercent: null, isForecast: true },
    ];
    const primary = primarySeries(observations);

    const rows = buildHourlyRows(primary, [], "metric");

    expect(rows[0].primary).toBe(10);
    expect(rows[0].primaryForecast).toBeNull();

    // Boundary row: value present in both the observed and forecast keys.
    expect(rows[1].primary).toBe(12);
    expect(rows[1].primaryForecast).toBe(12);
    expect(rows[1].primaryPrecipitation).toBe(2);
    expect(rows[1].primaryPrecipitationForecast).toBe(2);

    expect(rows[2].primary).toBeNull();
    expect(rows[2].primaryForecast).toBe(14);
    expect(rows[3].primary).toBeNull();
    expect(rows[3].primaryForecast).toBe(16);
  });

  it("buildHourlyRows: nearby-station rows are unaffected by the primary series' forecast points", () => {
    const t = hoursFromNow(1);
    const primary = primarySeries([
      obs({ timestamp: t, temperature: 20, isForecast: true }),
    ]);
    const stations = [nearby("a", [obs({ timestamp: t, temperature: 5 })])];

    const rows = buildHourlyRows(primary, stations, "metric");

    expect(rows[0][seriesKey(1)]).toBe(5);
  });

  it("buildHourlyRows: with no forecast points at all, forecast keys are all null (no boundary to bridge)", () => {
    const primary = primarySeries([
      obs({ timestamp: hoursFromNow(-1), temperature: 10 }),
      obs({ timestamp: hoursFromNow(0), temperature: 12 }),
    ]);

    const rows = buildHourlyRows(primary, [], "metric");

    expect(rows.every((r) => r.primaryForecast === null)).toBe(true);
  });

  it("buildDailyRows: forecast keys mirror the boundary-duplication behavior at daily granularity", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: hoursFromNow(-1), temperature: 10, precipitation: 1 }), // most recent past bucket (index 0)
      obs({ timestamp: hoursFromNow(1), temperature: 15, precipitation: 2, isForecast: true }), // first future bucket (index -1)
    ];
    const primary = primarySeries(observations);

    const rows = buildDailyRows(primary, [], "metric", 7);
    const pastRow = rows[rows.length - 2];
    const forecastRow = rows[rows.length - 1];

    expect(pastRow.primaryHigh).toBe(10);
    expect(pastRow.primaryHighForecast).toBe(10); // boundary bridged forward
    expect(forecastRow.primaryHigh).toBeNull();
    expect(forecastRow.primaryHighForecast).toBe(15);
    expect(forecastRow.primaryPrecipitationForecast).toBeCloseTo(2);
  });

  it("buildMetricDailyRows: forecast key present for a forecast-only bucket (rain)", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: hoursFromNow(1), precipitation: 4, isForecast: true }),
    ];
    const primary = primarySeries(observations);

    const rows = buildMetricDailyRows(primary, [], "metric", "rain", 7);
    const forecastRow = rows[rows.length - 1];

    expect(forecastRow[seriesKey(0)]).toBeNull();
    expect(forecastRow[forecastKey(seriesKey(0))]).toBeCloseTo(4);
  });

  it("does not fabricate forecast days beyond what the observations actually contain", () => {
    const observations: WeatherObservation[] = [
      obs({ timestamp: hoursFromNow(-1), temperature: 10 }),
      obs({ timestamp: hoursFromNow(1), temperature: 12, isForecast: true }), // exactly 1 forecast day
    ];
    const primary = primarySeries(observations);

    const rows = buildDailyRows(primary, [], "metric", 7);

    // 7 past-window rows + exactly 1 forecast row.
    expect(rows).toHaveLength(8);
  });

  it("buildMetricHourlyRows: forecast key mirrors the boundary-duplication behavior for a single-series metric (wind)", () => {
    const observations = [
      obs({ timestamp: hoursFromNow(-1), windSpeed: 3 }),
      obs({ timestamp: hoursFromNow(0), windSpeed: 4 }), // boundary
      obs({ timestamp: hoursFromNow(1), windSpeed: 5, isForecast: true }),
    ];
    const primary = primarySeries(observations);

    const rows = buildMetricHourlyRows(primary, [], "metric", "wind");
    const key = seriesKey(0);
    const fKey = forecastKey(key);

    expect(rows[0][key]).toBe(3);
    expect(rows[0][fKey]).toBeNull();
    expect(rows[1][key]).toBe(4);
    expect(rows[1][fKey]).toBe(4); // boundary duplicated
    expect(rows[2][key]).toBeNull();
    expect(rows[2][fKey]).toBe(5);
  });
});

describe("forecastBoundaryValue (006-forecast-now-marker)", () => {
  function hoursFromNow(h: number): string {
    return new Date(Date.now() + h * 3600_000).toISOString();
  }

  it("returns null when there is no forecast in the array", () => {
    const items: WeatherObservation[] = [
      obs({ timestamp: hoursFromNow(-2), temperature: 10 }),
      obs({ timestamp: hoursFromNow(-1), temperature: 11 }),
    ];
    expect(forecastBoundaryValue(items, "timestamp")).toBeNull();
  });

  it("returns null when the first item is already forecast (nothing precedes it)", () => {
    const items: WeatherObservation[] = [
      obs({ timestamp: hoursFromNow(1), temperature: 12, isForecast: true }),
    ];
    expect(forecastBoundaryValue(items, "timestamp")).toBeNull();
  });

  it("returns the preceding item's key value for a WeatherObservation[] array", () => {
    const boundary = hoursFromNow(0);
    const items: WeatherObservation[] = [
      obs({ timestamp: hoursFromNow(-1), temperature: 10 }),
      obs({ timestamp: boundary, temperature: 11 }),
      obs({ timestamp: hoursFromNow(1), temperature: 12, isForecast: true }),
    ];
    expect(forecastBoundaryValue(items, "timestamp")).toBe(boundary);
  });

  it("returns the preceding item's key value for a DailyAggregate[] array", () => {
    const boundary = hoursFromNow(0);
    const items: DailyAggregate[] = [
      {
        bucketEnd: hoursFromNow(-24),
        high: null,
        low: null,
        average: null,
        totalPrecipitation: null,
        windAverage: null,
        cloudAverage: null,
        windHigh: null,
        windLow: null,
      },
      {
        bucketEnd: boundary,
        high: null,
        low: null,
        average: null,
        totalPrecipitation: null,
        windAverage: null,
        cloudAverage: null,
        windHigh: null,
        windLow: null,
      },
      {
        bucketEnd: hoursFromNow(24),
        high: null,
        low: null,
        average: null,
        totalPrecipitation: null,
        windAverage: null,
        cloudAverage: null,
        windHigh: null,
        windLow: null,
        isForecast: true,
      },
    ];
    expect(forecastBoundaryValue(items, "bucketEnd")).toBe(boundary);
  });
});

describe("isMetricAvailable", () => {
  it("returns false when every observation has a null value for the metric's field", () => {
    const series = primarySeries([
      obs({ timestamp: "2026-08-31T10:00:00Z" }),
      obs({ timestamp: "2026-08-31T11:00:00Z" }),
    ]);
    expect(isMetricAvailable(series, "wind")).toBe(false);
  });

  it("returns true when at least one observation has a non-null value", () => {
    const series = primarySeries([
      obs({ timestamp: "2026-08-31T10:00:00Z" }),
      obs({ timestamp: "2026-08-31T11:00:00Z", windSpeed: 3 }),
    ]);
    expect(isMetricAvailable(series, "wind")).toBe(true);
  });

  it("treats zero observations as available (a different, already-handled state)", () => {
    expect(isMetricAvailable(primarySeries([]), "wind")).toBe(true);
  });
});

describe("findObservedExtremes (013-overview-default-and-layout)", () => {
  function hoursAgo(h: number): string {
    return new Date(Date.now() - h * 3600_000).toISOString();
  }

  function hoursFromNow(h: number): string {
    return new Date(Date.now() + h * 3600_000).toISOString();
  }

  it("finds the correct high and low among observed points", () => {
    const t3 = hoursAgo(3);
    const t2 = hoursAgo(2);
    const t1 = hoursAgo(1);
    const result = findObservedExtremes([
      obs({ timestamp: t3, temperature: 10 }),
      obs({ timestamp: t2, temperature: 22 }),
      obs({ timestamp: t1, temperature: 3 }),
    ]);

    expect(result?.high).toEqual({ value: 22, timestamp: t2 });
    expect(result?.low).toEqual({ value: 3, timestamp: t1 });
  });

  it("excludes forecast points even when more extreme than any observed point", () => {
    const result = findObservedExtremes([
      obs({ timestamp: hoursAgo(1), temperature: 10 }),
      obs({ timestamp: hoursFromNow(1), temperature: 40, isForecast: true }),
      obs({ timestamp: hoursFromNow(2), temperature: -40, isForecast: true }),
    ]);

    expect(result?.high.value).toBe(10);
    expect(result?.low.value).toBe(10);
  });

  it("returns null for an empty series", () => {
    expect(findObservedExtremes([])).toBeNull();
  });

  it("returns null when every observation is forecast or has a null temperature", () => {
    const result = findObservedExtremes([
      obs({ timestamp: hoursAgo(1), temperature: null }),
      obs({ timestamp: hoursFromNow(1), temperature: 20, isForecast: true }),
    ]);

    expect(result).toBeNull();
  });

  it("resolves a tie to the first (oldest) occurrence", () => {
    const t2 = hoursAgo(2);
    const result = findObservedExtremes([
      obs({ timestamp: t2, temperature: 15 }),
      obs({ timestamp: hoursAgo(1), temperature: 15 }),
    ]);

    expect(result?.high.timestamp).toBe(t2);
    expect(result?.low.timestamp).toBe(t2);
  });
});
