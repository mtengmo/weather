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

  it("getObservations maps a parameter-6 station reading onto relativeHumidity (050-show-humidity-level)", async () => {
    const presentHour = isoHourStart(1);

    mockFetchRouter({
      "/parameter/1.json": stationListBody([
        { key: "t1", name: "Temp", latitude: 59.331, longitude: 18.061, active: true },
      ]),
      "/parameter/7.json": stationListBody([]),
      "/parameter/6.json": stationListBody([
        { key: "h1", name: "Humidity", latitude: 59.331, longitude: 18.061, active: true },
      ]),
      "/parameter/1/station/t1/period/latest-day/data.json": {
        value: [{ date: presentHour, value: "12.5", quality: "G" }],
      },
      "/parameter/6/station/h1/period/latest-day/data.json": {
        value: [{ date: presentHour, value: "56", quality: "G" }],
      },
    });

    const { getObservations } = await freshProvider();
    const result = await getObservations(STOCKHOLM, "last-24-hours");

    const present = result.observations.find((o) => o.temperature === 12.5);
    expect(present?.relativeHumidity).toBe(56);
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

    it("maps relative_humidity onto relativeHumidity (050-show-humidity-level)", async () => {
      mockFetchRouter({
        ...baseStations,
        "/parameter/6.json": stationListBody([]),
        "/category/snow1g/version/1/geotype/point": forecastBody([
          { time: isoHourFromNow(1), data: { air_temperature: 10, relative_humidity: 56 } },
        ]),
      });

      const { getObservations } = await freshProvider();
      const result = await getObservations(STOCKHOLM, "last-24-hours");

      const forecastPoints = result.observations.filter((o) => o.isForecast);
      expect(forecastPoints[0].relativeHumidity).toBe(56);
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

    describe("symbol_code -> symbolCondition (022-met-forecast-source, research.md §3)", () => {
      it("maps symbol_code 11 (thunderstorm) to symbolCondition thunderstorm", async () => {
        mockFetchRouter({
          ...baseStations,
          "/category/snow1g/version/1/geotype/point": forecastBody([
            { time: isoHourFromNow(1), data: { air_temperature: 10, symbol_code: 11 } },
          ]),
        });

        const { getObservations } = await freshProvider();
        const result = await getObservations(STOCKHOLM, "last-24-hours");

        expect(result.observations.find((o) => o.isForecast)?.symbolCondition).toBe("thunderstorm");
      });

      it("maps symbol_code 7 (fog) to symbolCondition foggy", async () => {
        mockFetchRouter({
          ...baseStations,
          "/category/snow1g/version/1/geotype/point": forecastBody([
            { time: isoHourFromNow(1), data: { air_temperature: 10, symbol_code: 7 } },
          ]),
        });

        const { getObservations } = await freshProvider();
        const result = await getObservations(STOCKHOLM, "last-24-hours");

        expect(result.observations.find((o) => o.isForecast)?.symbolCondition).toBe("foggy");
      });

      it("maps symbol_code 22 (light sleet) to symbolCondition sleet", async () => {
        mockFetchRouter({
          ...baseStations,
          "/category/snow1g/version/1/geotype/point": forecastBody([
            { time: isoHourFromNow(1), data: { air_temperature: 10, symbol_code: 22 } },
          ]),
        });

        const { getObservations } = await freshProvider();
        const result = await getObservations(STOCKHOLM, "last-24-hours");

        expect(result.observations.find((o) => o.isForecast)?.symbolCondition).toBe("sleet");
      });

      it("maps symbol_code 3/4 (variable/halfclear) to symbolCondition partly-cloudy, and 5/6 (cloudy/overcast) to cloudy (038-granular-weather-icons-and-graph-header, US1)", async () => {
        for (const [symbolCode, expected] of [
          [3, "partly-cloudy"],
          [4, "partly-cloudy"],
          [5, "cloudy"],
          [6, "cloudy"],
        ] as const) {
          mockFetchRouter({
            ...baseStations,
            "/category/snow1g/version/1/geotype/point": forecastBody([
              { time: isoHourFromNow(1), data: { air_temperature: 10, symbol_code: symbolCode } },
            ]),
          });

          const { getObservations } = await freshProvider();
          const result = await getObservations(STOCKHOLM, "last-24-hours");

          expect(result.observations.find((o) => o.isForecast)?.symbolCondition).toBe(expected);
        }
      });

      it("resolves symbol_code 1 (clear) to clear-day or clear-night via the observation's own timestamp", async () => {
        mockFetchRouter({
          ...baseStations,
          "/category/snow1g/version/1/geotype/point": forecastBody([
            { time: isoHourFromNow(1), data: { air_temperature: 10, symbol_code: 1 } },
          ]),
        });

        const { getObservations } = await freshProvider();
        const result = await getObservations(STOCKHOLM, "last-24-hours");

        const condition = result.observations.find((o) => o.isForecast)?.symbolCondition;
        expect(["clear-day", "clear-night"]).toContain(condition);
      });

      it("maps symbol_code 8/18 (light rain) and 9/10/19/20 (moderate/heavy rain) per the two-tier model (032-dashboard-polish-round-seven, US5)", async () => {
        mockFetchRouter({
          ...baseStations,
          "/category/snow1g/version/1/geotype/point": forecastBody([
            { time: isoHourFromNow(1), data: { air_temperature: 10, symbol_code: 8 } },
          ]),
        });

        const { getObservations } = await freshProvider();
        const result = await getObservations(STOCKHOLM, "last-24-hours");

        expect(result.observations.find((o) => o.isForecast)?.symbolCondition).toBe("light-rain");
      });

      it("maps symbol_code 10 (heavy rain) to symbolCondition heavy-rain", async () => {
        mockFetchRouter({
          ...baseStations,
          "/category/snow1g/version/1/geotype/point": forecastBody([
            { time: isoHourFromNow(1), data: { air_temperature: 10, symbol_code: 10 } },
          ]),
        });

        const { getObservations } = await freshProvider();
        const result = await getObservations(STOCKHOLM, "last-24-hours");

        expect(result.observations.find((o) => o.isForecast)?.symbolCondition).toBe("heavy-rain");
      });

      it("maps symbol_code 15 (light snow) and 27 (heavy snow) per the two-tier model", async () => {
        mockFetchRouter({
          ...baseStations,
          "/category/snow1g/version/1/geotype/point": forecastBody([
            { time: isoHourFromNow(1), data: { air_temperature: -2, symbol_code: 15 } },
          ]),
        });
        const { getObservations: getObservations1 } = await freshProvider();
        const result1 = await getObservations1(STOCKHOLM, "last-24-hours");
        expect(result1.observations.find((o) => o.isForecast)?.symbolCondition).toBe("light-snow");

        mockFetchRouter({
          ...baseStations,
          "/category/snow1g/version/1/geotype/point": forecastBody([
            { time: isoHourFromNow(1), data: { air_temperature: -2, symbol_code: 27 } },
          ]),
        });
        const { getObservations: getObservations2 } = await freshProvider();
        const result2 = await getObservations2(STOCKHOLM, "last-24-hours");
        expect(result2.observations.find((o) => o.isForecast)?.symbolCondition).toBe("heavy-snow");
      });

      it("leaves symbolCondition null when no symbol_code is present", async () => {
        mockFetchRouter({
          ...baseStations,
          "/category/snow1g/version/1/geotype/point": forecastBody([
            { time: isoHourFromNow(1), data: { air_temperature: 10 } },
          ]),
        });

        const { getObservations } = await freshProvider();
        const result = await getObservations(STOCKHOLM, "last-24-hours");

        expect(result.observations.find((o) => o.isForecast)?.symbolCondition).toBeNull();
      });
    });

    describe("probability_of_precipitation -> chanceOfRain (024-restore-rain-chance, research.md §1)", () => {
      it("threads a genuine probability_of_precipitation value onto chanceOfRain", async () => {
        mockFetchRouter({
          ...baseStations,
          "/category/snow1g/version/1/geotype/point": forecastBody([
            { time: isoHourFromNow(1), data: { air_temperature: 10, probability_of_precipitation: 70 } },
          ]),
        });

        const { getObservations } = await freshProvider();
        const result = await getObservations(STOCKHOLM, "last-24-hours");

        expect(result.observations.find((o) => o.isForecast)?.chanceOfRain).toBe(70);
      });

      it("leaves chanceOfRain null when no probability_of_precipitation is present", async () => {
        mockFetchRouter({
          ...baseStations,
          "/category/snow1g/version/1/geotype/point": forecastBody([
            { time: isoHourFromNow(1), data: { air_temperature: 10 } },
          ]),
        });

        const { getObservations } = await freshProvider();
        const result = await getObservations(STOCKHOLM, "last-24-hours");

        expect(result.observations.find((o) => o.isForecast)?.chanceOfRain).toBeNull();
      });
    });

    it("rounds raw geolocation coordinates to 6 decimals before requesting the forecast (021 follow-up)", async () => {
      // SMHI's forecast API 404s (surfaced by the browser as a misleading CORS error) once the
      // URL's lat/lon exceed 6 decimal places — confirmed live. Raw browser geolocation
      // coordinates commonly carry 10+ decimals, so every geolocation-sourced location silently
      // lost its real SMHI forecast timestamp until the coordinates were rounded before the
      // request was built.
      const requestedUrls: string[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
          if (url.includes("/category/snow1g/version/1/geotype/point")) requestedUrls.push(url);
          for (const [pattern, body] of Object.entries(baseStations)) {
            if (url.includes(pattern)) return { ok: true, status: 200, json: async () => body };
          }
          return { ok: true, status: 200, json: async () => forecastBody([]) };
        })
      );

      const { getObservations } = await freshProvider();
      await getObservations({ latitude: 59.84308579590745, longitude: 17.63027201883273 }, "last-24-hours");

      expect(requestedUrls).toHaveLength(1);
      expect(requestedUrls[0]).toContain("lon/17.630272/lat/59.843086");
    });

    describe("getForecastOnly (025-reduce-api-requests, US2)", () => {
      it("returns forecast observations and issuedAt without fetching any observation parameters", async () => {
        const requestedUrls: string[] = [];
        vi.stubGlobal(
          "fetch",
          vi.fn(async (url: string) => {
            requestedUrls.push(url);
            return {
              ok: true,
              status: 200,
              json: async () => ({
                createdTime: "2026-09-06T08:00:00Z",
                timeSeries: [{ time: isoHourFromNow(1), data: { air_temperature: 12 } }],
              }),
            };
          })
        );

        const { getForecastOnly } = await freshProvider();
        const result = await getForecastOnly(STOCKHOLM, "last-24-hours");

        expect(result.observations).toHaveLength(24);
        expect(result.observations[0].temperature).toBe(12);
        expect(result.issuedAt).toBe("2026-09-06T08:00:00Z");
        // Only the forecast URL is requested — no /parameter/... observation-parameter fetches.
        expect(requestedUrls).toHaveLength(1);
        expect(requestedUrls[0]).toContain("/category/snow1g/version/1/geotype/point");
      });

      it("returns empty observations and null issuedAt for last-30-days (forecast out of scope)", async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(async () => {
            throw new Error("should not be called for last-30-days");
          })
        );

        const { getForecastOnly } = await freshProvider();
        const result = await getForecastOnly(STOCKHOLM, "last-30-days");

        expect(result).toEqual({ observations: [], issuedAt: null });
      });

      it("degrades to empty observations and null issuedAt when the forecast request fails", async () => {
        mockFetchRouter({}); // no handler -> 404 in mockFetchRouter

        const { getForecastOnly } = await freshProvider();
        const result = await getForecastOnly(STOCKHOLM, "last-24-hours");

        expect(result).toEqual({ observations: [], issuedAt: null });
      });
    });

    describe("getUvIndex (027-uv-index-alert)", () => {
      it("converts STRÅNG irradiance (mW/m²) to UV Index and returns only hour keys at/above the risk threshold", async () => {
        const middayIso = new Date(Math.floor(Date.now() / 3600_000 + 3) * 3600_000).toISOString();
        const eveningIso = new Date(Math.floor(Date.now() / 3600_000 + 4) * 3600_000).toISOString();

        mockFetchRouter({
          "strang1g": [
            { date_time: middayIso, value: 200 }, // 200/25 = UV Index 8 -> risky
            { date_time: eveningIso, value: 50 }, // 50/25 = UV Index 2 -> not risky
          ],
        });

        const { getUvIndex } = await freshProvider();
        const riskyHours = await getUvIndex(STOCKHOLM, "last-24-hours");

        expect(riskyHours.has(Math.floor(Date.parse(middayIso) / 3600_000))).toBe(true);
        expect(riskyHours.has(Math.floor(Date.parse(eveningIso) / 3600_000))).toBe(false);
        expect(riskyHours.size).toBe(1);
      });

      it("treats exactly UV Index 6 as risky (inclusive threshold)", async () => {
        const hourIso = new Date(Math.floor(Date.now() / 3600_000 + 2) * 3600_000).toISOString();
        mockFetchRouter({ "strang1g": [{ date_time: hourIso, value: 150 }] }); // 150/25 = 6 exactly

        const { getUvIndex } = await freshProvider();
        const riskyHours = await getUvIndex(STOCKHOLM, "last-24-hours");

        expect(riskyHours.has(Math.floor(Date.parse(hourIso) / 3600_000))).toBe(true);
      });

      it("degrades to an empty Set when the request fails, never throws", async () => {
        mockFetchRouter({}); // no handler -> 404

        const { getUvIndex } = await freshProvider();
        const riskyHours = await getUvIndex(STOCKHOLM, "last-24-hours");

        expect(riskyHours.size).toBe(0);
      });

      it("degrades to an empty Set when fetch itself rejects", async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(async () => {
            throw new Error("network error");
          })
        );

        const { getUvIndex } = await freshProvider();
        const riskyHours = await getUvIndex(STOCKHOLM, "last-24-hours");

        expect(riskyHours.size).toBe(0);
      });
    });

    describe("getActiveWarnings (028-severe-weather-warnings)", () => {
      it("returns the parsed warning list on success", async () => {
        const sample = [{ id: 1, event: { en: "Storm" }, warningAreas: [] }];
        mockFetchRouter({ "ibww/api/version/1/warning.json": sample });

        const { getActiveWarnings } = await freshProvider();
        const result = await getActiveWarnings();

        expect(result).toEqual(sample);
      });

      it("degrades to an empty array when the request fails", async () => {
        mockFetchRouter({}); // no handler -> 404

        const { getActiveWarnings } = await freshProvider();
        const result = await getActiveWarnings();

        expect(result).toEqual([]);
      });

      it("degrades to an empty array when fetch itself rejects", async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(async () => {
            throw new Error("network error");
          })
        );

        const { getActiveWarnings } = await freshProvider();
        const result = await getActiveWarnings();

        expect(result).toEqual([]);
      });
    });
  });
});
