import { afterEach, describe, expect, it, vi } from "vitest";
import { getForecastOnly, getObservations } from "../../src/services/openMeteoProvider";

function isoHoursBack(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString().slice(0, 13) + ":00";
}

function mockFetchOnce(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      json: async () => body,
    })
  );
}

describe("openMeteoProvider.getObservations", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps hourly data and trims to the trailing 24 points for last-24-hours", async () => {
    const time = Array.from({ length: 30 }, (_, i) => isoHoursBack(29 - i));
    const temperature_2m = time.map((_, i) => i);
    const precipitation = time.map((_, i) => i * 0.1);

    mockFetchOnce({ hourly: { time, temperature_2m, precipitation } });

    const result = await getObservations({ latitude: 1, longitude: 2 }, "last-24-hours");

    expect(result.status).toBe("ready");
    expect(result.observations.length).toBeLessThanOrEqual(24);
    expect(result.observations.length).toBeGreaterThan(0);
  });

  it("preserves null values as gaps instead of coercing to zero", async () => {
    const time = [isoHoursBack(2), isoHoursBack(1), isoHoursBack(0)];
    mockFetchOnce({
      hourly: { time, temperature_2m: [10, null, 12], precipitation: [0, null, 1] },
    });

    const result = await getObservations({ latitude: 1, longitude: 2 }, "last-24-hours");

    const gapPoint = result.observations.find((o) => o.temperature === null);
    expect(gapPoint).toBeDefined();
    expect(gapPoint?.precipitation).toBeNull();
  });

  it("returns status unavailable on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await getObservations({ latitude: 1, longitude: 2 }, "last-24-hours");

    expect(result.status).toBe("unavailable");
    expect(result.observations).toEqual([]);
  });

  it("returns status unavailable on a non-ok response", async () => {
    mockFetchOnce({}, false);

    const result = await getObservations({ latitude: 1, longitude: 2 }, "last-7-days");

    expect(result.status).toBe("unavailable");
  });

  describe("forecast (005-add-weather-forecast)", () => {
    it("retains and tags rows at/after 'now' as forecast for last-24-hours, instead of trimming them", async () => {
      // 2 hours in the past, "now", and 24 hours ahead.
      const time = [
        isoHoursBack(2),
        isoHoursBack(1),
        isoHoursBack(0),
        ...Array.from({ length: 24 }, (_, i) => isoHoursBack(-(i + 1))),
      ];
      const temperature_2m = time.map((_, i) => i);

      mockFetchOnce({ hourly: { time, temperature_2m, precipitation: time.map(() => 0) } });

      const result = await getObservations({ latitude: 1, longitude: 2 }, "last-24-hours");

      const forecastPoints = result.observations.filter((o) => o.isForecast);
      expect(forecastPoints.length).toBeGreaterThan(0);
      expect(forecastPoints.every((o) => Date.parse(o.timestamp) > Date.now())).toBe(true);
      const observedPoints = result.observations.filter((o) => !o.isForecast);
      expect(observedPoints.every((o) => Date.parse(o.timestamp) <= Date.now())).toBe(true);
    });

    it("caps forecast points at 168 hours for last-7-days", async () => {
      const time = [
        isoHoursBack(1),
        ...Array.from({ length: 200 }, (_, i) => isoHoursBack(-(i + 1))),
      ];
      const temperature_2m = time.map(() => 5);

      mockFetchOnce({ hourly: { time, temperature_2m, precipitation: time.map(() => 0) } });

      const result = await getObservations({ latitude: 1, longitude: 2 }, "last-7-days");

      const forecastPoints = result.observations.filter((o) => o.isForecast);
      expect(forecastPoints.length).toBeLessThanOrEqual(24 * 7);
    });

    it("includes no forecast points for last-30-days", async () => {
      const time = [
        isoHoursBack(1),
        ...Array.from({ length: 5 }, (_, i) => isoHoursBack(-(i + 1))),
      ];
      const temperature_2m = time.map(() => 5);

      mockFetchOnce({ hourly: { time, temperature_2m, precipitation: time.map(() => 0) } });

      const result = await getObservations({ latitude: 1, longitude: 2 }, "last-30-days");

      expect(result.observations.some((o) => o.isForecast)).toBe(false);
    });
  });
});

describe("openMeteoProvider.getForecastOnly (006-forecast-now-marker)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns just the forecast-tagged points matching what getObservations would produce", async () => {
    const time = [
      isoHoursBack(1),
      ...Array.from({ length: 24 }, (_, i) => isoHoursBack(-(i + 1))),
    ];
    const temperature_2m = time.map((_, i) => i);

    mockFetchOnce({ hourly: { time, temperature_2m, precipitation: time.map(() => 0) } });

    const result = await getForecastOnly({ latitude: 1, longitude: 2 }, "last-24-hours");

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((o) => o.isForecast)).toBe(true);
    expect(result.every((o) => Date.parse(o.timestamp) > Date.now())).toBe(true);
  });

  it("returns [] on a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await getForecastOnly({ latitude: 1, longitude: 2 }, "last-24-hours");

    expect(result).toEqual([]);
  });

  it("returns [] on a non-ok response", async () => {
    mockFetchOnce({}, false);

    const result = await getForecastOnly({ latitude: 1, longitude: 2 }, "last-24-hours");

    expect(result).toEqual([]);
  });

  it("returns [] when the response has no hourly data", async () => {
    mockFetchOnce({});

    const result = await getForecastOnly({ latitude: 1, longitude: 2 }, "last-24-hours");

    expect(result).toEqual([]);
  });

  it("returns [] for last-30-days (out of forecast scope)", async () => {
    const time = [isoHoursBack(1), isoHoursBack(-1)];
    mockFetchOnce({ hourly: { time, temperature_2m: [5, 6], precipitation: [0, 0] } });

    const result = await getForecastOnly({ latitude: 1, longitude: 2 }, "last-30-days");

    expect(result).toEqual([]);
  });
});
