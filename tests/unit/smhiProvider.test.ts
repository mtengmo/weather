import { afterEach, describe, expect, it, vi } from "vitest";

const STOCKHOLM = { latitude: 59.33, longitude: 18.06 };

function stationListBody(
  stations: { key: string; name: string; latitude: number; longitude: number; active: boolean }[]
) {
  return { station: stations };
}

function isoHourStart(hoursAgo: number): number {
  const now = Date.now();
  const hourMs = 3600_000;
  return Math.floor((now - hoursAgo * hourMs) / hourMs) * hourMs;
}

function mockFetchRouter(handlers: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      for (const [pattern, body] of Object.entries(handlers)) {
        if (url.includes(pattern)) {
          return { ok: true, status: 200, json: async () => body };
        }
      }
      return { ok: false, status: 404, json: async () => ({}) };
    })
  );
}

// smhiProvider caches its station list per parameter at module scope, so each test
// gets a fresh module instance (and thus a fresh cache) via a dynamic re-import.
async function freshProvider() {
  vi.resetModules();
  return import("../../src/services/smhiProvider");
}

describe("smhiProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("isCovered returns true when the nearest active station is within 50km", async () => {
    mockFetchRouter({
      "/parameter/1.json": stationListBody([
        { key: "1", name: "Near", latitude: 59.34, longitude: 18.07, active: true },
      ]),
    });

    const { isCovered } = await freshProvider();
    await expect(isCovered(STOCKHOLM)).resolves.toBe(true);
  });

  it("isCovered ignores inactive stations", async () => {
    mockFetchRouter({
      "/parameter/1.json": stationListBody([
        { key: "1", name: "Inactive", latitude: 59.34, longitude: 18.07, active: false },
      ]),
    });

    const { isCovered } = await freshProvider();
    await expect(isCovered(STOCKHOLM)).resolves.toBe(false);
  });

  it("isCovered returns false when the nearest active station is beyond 50km", async () => {
    mockFetchRouter({
      "/parameter/1.json": stationListBody([
        { key: "1", name: "Far", latitude: 65, longitude: 20, active: true },
      ]),
    });

    const { isCovered } = await freshProvider();
    await expect(isCovered(STOCKHOLM)).resolves.toBe(false);
  });

  it("getNearestStations returns stations sorted by distance, limited to count", async () => {
    mockFetchRouter({
      "/parameter/1.json": stationListBody([
        { key: "far", name: "Far", latitude: 65, longitude: 20, active: true },
        { key: "near", name: "Near", latitude: 59.331, longitude: 18.061, active: true },
        { key: "mid", name: "Mid", latitude: 60, longitude: 18, active: true },
      ]),
    });

    const { getNearestStations } = await freshProvider();
    const result = await getNearestStations(STOCKHOLM, 2);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("near");
    expect(result[1].id).toBe("mid");
  });

  it("getObservations fills missing hours with null (gap) rather than dropping them", async () => {
    const presentHour = isoHourStart(1);

    mockFetchRouter({
      "/parameter/1.json": stationListBody([
        { key: "t1", name: "Temp", latitude: 59.331, longitude: 18.061, active: true },
      ]),
      "/parameter/7.json": stationListBody([
        { key: "p1", name: "Precip", latitude: 59.331, longitude: 18.061, active: true },
      ]),
      "/parameter/1/station/t1/period/latest-day/data.json": {
        value: [{ date: presentHour, value: "12.5", quality: "G" }],
      },
      "/parameter/7/station/p1/period/latest-day/data.json": {
        value: [{ date: presentHour, value: "0.0", quality: "G" }],
      },
    });

    const { getObservations } = await freshProvider();
    const result = await getObservations(STOCKHOLM, "last-24-hours");

    expect(result.status).toBe("ready");
    expect(result.observations).toHaveLength(24);
    const gaps = result.observations.filter((o) => o.temperature === null);
    expect(gaps.length).toBeGreaterThan(0);
    const present = result.observations.find((o) => o.temperature === 12.5);
    expect(present).toBeDefined();
  });

  it("getNearestStations falls back to 'Unnamed station' when the source name is blank", async () => {
    mockFetchRouter({
      "/parameter/1.json": stationListBody([
        { key: "blank", name: "", latitude: 59.331, longitude: 18.061, active: true },
        { key: "whitespace", name: "   ", latitude: 59.332, longitude: 18.062, active: true },
        { key: "named", name: "Real Name", latitude: 59.333, longitude: 18.063, active: true },
      ]),
    });

    const { getNearestStations } = await freshProvider();
    const result = await getNearestStations(STOCKHOLM, 3);

    const byId = Object.fromEntries(result.map((s) => [s.id, s.displayName]));
    expect(byId.blank).toBe("Unnamed station");
    expect(byId.whitespace).toBe("Unnamed station");
    expect(byId.named).toBe("Real Name");
  });

  it("getObservations throws when no active temperature station exists", async () => {
    mockFetchRouter({
      "/parameter/1.json": stationListBody([]),
      "/parameter/7.json": stationListBody([]),
    });

    const { getObservations } = await freshProvider();
    await expect(getObservations(STOCKHOLM, "last-24-hours")).rejects.toThrow();
  });

  describe("forecast (005-add-weather-forecast)", () => {
    function forecastBody(entries: { time: string; data: Record<string, number> }[]) {
      return { timeSeries: entries };
    }

    function isoHourFromNow(hoursAhead: number): string {
      const now = Date.now();
      const hourMs = 3600_000;
      return new Date((Math.floor(now / hourMs) + hoursAhead) * hourMs).toISOString();
    }

    const baseStations = {
      "/parameter/1.json": stationListBody([
        { key: "t1", name: "Temp", latitude: 59.331, longitude: 18.061, active: true },
      ]),
      "/parameter/7.json": stationListBody([
        { key: "p1", name: "Precip", latitude: 59.331, longitude: 18.061, active: true },
      ]),
      "/parameter/1/station/t1/period/latest-day/data.json": { value: [] },
      "/parameter/7/station/p1/period/latest-day/data.json": { value: [] },
      "/parameter/1/station/t1/period/latest-months/data.json": { value: [] },
      "/parameter/7/station/p1/period/latest-months/data.json": { value: [] },
    };

    it("appends 24 forecast hours past 'now', tagged isForecast, for last-24-hours", async () => {
      mockFetchRouter({
        ...baseStations,
        "/category/snow1g/version/1/geotype/point": forecastBody(
          Array.from({ length: 24 }, (_, i) => ({
            time: isoHourFromNow(i + 1),
            data: {
              air_temperature: 10 + i,
              wind_speed: 3,
              precipitation_amount_mean: 0,
              cloud_area_fraction: 4,
            },
          }))
        ),
      });

      const { getObservations } = await freshProvider();
      const result = await getObservations(STOCKHOLM, "last-24-hours");

      const forecastPoints = result.observations.filter((o) => o.isForecast);
      expect(forecastPoints).toHaveLength(24);
      expect(forecastPoints[0].temperature).toBe(10);
      // Octas (0-8) converted to percent (0-100): 4 octas -> 50%.
      expect(forecastPoints[0].cloudCoverPercent).toBe(50);
    });

    it("appends up to 168 forecast hours for last-7-days", async () => {
      mockFetchRouter({
        ...baseStations,
        "/category/snow1g/version/1/geotype/point": forecastBody(
          Array.from({ length: 10 }, (_, i) => ({
            time: isoHourFromNow(i + 1),
            data: { air_temperature: 5 },
          }))
        ),
      });

      const { getObservations } = await freshProvider();
      const result = await getObservations(STOCKHOLM, "last-7-days");

      const forecastPoints = result.observations.filter((o) => o.isForecast);
      expect(forecastPoints).toHaveLength(24 * 7);
      // Only the first 10 hours have provider data; the rest are gaps (nulls), not dropped.
      expect(forecastPoints.filter((o) => o.temperature !== null)).toHaveLength(10);
    });

    it("appends no forecast points for last-30-days", async () => {
      mockFetchRouter({
        ...baseStations,
        "/category/snow1g/version/1/geotype/point": forecastBody([
          { time: isoHourFromNow(1), data: { air_temperature: 5 } },
        ]),
      });

      const { getObservations } = await freshProvider();
      const result = await getObservations(STOCKHOLM, "last-30-days");

      expect(result.observations.some((o) => o.isForecast)).toBe(false);
    });

    it("degrades to no forecast points (not an error) when the forecast request fails", async () => {
      mockFetchRouter(baseStations); // no handler for the forecast URL -> 404 in mockFetchRouter

      const { getObservations } = await freshProvider();
      const result = await getObservations(STOCKHOLM, "last-24-hours");

      expect(result.status).toBe("ready");
      expect(result.observations.some((o) => o.isForecast)).toBe(false);
    });
  });
});
