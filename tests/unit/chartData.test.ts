import { describe, expect, it } from "vitest";
import {
  buildDailyRows,
  buildMetricDailyRows,
  buildMetricHourlyRows,
  buildWindDailyRows,
  isMetricAvailable,
  seriesKey,
} from "../../src/components/chartData";
import type { NearbyStationSeries, ObservationSeries, WeatherObservation } from "../../src/models/types";

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
