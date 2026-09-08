import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyMetNoSymbol, getForecastOnly } from "../../src/services/metNoProvider";

const STOCKHOLM = { latitude: 59.33, longitude: 18.06 };

function isoHourFromNow(hoursAhead: number): string {
  const now = Date.now();
  const hourMs = 3600_000;
  return new Date((Math.floor(now / hourMs) + hoursAhead) * hourMs).toISOString();
}

function mockResponse(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body }))
  );
}

describe("metNoProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("classifyMetNoSymbol (022-met-forecast-source, research.md §3)", () => {
    it("matches thunder before any other substring", () => {
      expect(classifyMetNoSymbol("heavyrainandthunder")).toBe("thunderstorm");
    });

    it("matches fog", () => {
      expect(classifyMetNoSymbol("fog")).toBe("foggy");
    });

    it("matches sleet", () => {
      expect(classifyMetNoSymbol("lightsleet")).toBe("sleet");
    });

    it("matches snow, heavy-tier for a 'heavy'-prefixed code (032-dashboard-polish-round-seven, US5)", () => {
      expect(classifyMetNoSymbol("heavysnowshowers_day")).toBe("heavy-snow");
    });

    it("matches snow, light-tier for a 'light'-prefixed code", () => {
      expect(classifyMetNoSymbol("lightsnowshowers_day")).toBe("light-snow");
    });

    it("matches snow, heavy-tier for an unprefixed ('moderate') code", () => {
      expect(classifyMetNoSymbol("snow")).toBe("heavy-snow");
    });

    it("matches rain, light-tier for a 'light'-prefixed code", () => {
      expect(classifyMetNoSymbol("lightrainshowers_night")).toBe("light-rain");
    });

    it("matches rain, heavy-tier for a 'heavy'-prefixed code", () => {
      expect(classifyMetNoSymbol("heavyrainshowers_night")).toBe("heavy-rain");
    });

    it("matches rain, heavy-tier for an unprefixed ('moderate') code", () => {
      expect(classifyMetNoSymbol("rain")).toBe("heavy-rain");
    });

    it("resolves clearsky to clear-night when the code says night", () => {
      expect(classifyMetNoSymbol("clearsky_night")).toBe("clear-night");
    });

    it("resolves clearsky to clear-day when the code says day", () => {
      expect(classifyMetNoSymbol("clearsky_day")).toBe("clear-day");
    });

    it("matches fair/partlycloudy as partly-cloudy, and a plain cloudy code as cloudy (038-granular-weather-icons-and-graph-header, US1)", () => {
      expect(classifyMetNoSymbol("fair_day")).toBe("partly-cloudy");
      expect(classifyMetNoSymbol("partlycloudy_day")).toBe("partly-cloudy");
      expect(classifyMetNoSymbol("cloudy")).toBe("cloudy");
    });

    it("returns null for an unrecognized code", () => {
      expect(classifyMetNoSymbol("unknowncode")).toBeNull();
    });
  });

  describe("getForecastOnly", () => {
    it("threads properties.meta.updated_at verbatim as issuedAt", async () => {
      mockResponse({
        properties: {
          meta: { updated_at: "2026-09-06T08:00:00Z" },
          timeseries: [
            {
              time: isoHourFromNow(1),
              data: {
                instant: { details: { air_temperature: 10 } },
                next_1_hours: { summary: { symbol_code: "cloudy" } },
              },
            },
          ],
        },
      });

      const result = await getForecastOnly(STOCKHOLM, "last-24-hours");
      expect(result.issuedAt).toBe("2026-09-06T08:00:00Z");
      expect(result.observations).toHaveLength(1);
      expect(result.observations[0].temperature).toBe(10);
      expect(result.observations[0].symbolCondition).toBe("cloudy");
      expect(result.observations[0].isForecast).toBe(true);
    });

    it("returns issuedAt null when properties.meta.updated_at is absent", async () => {
      mockResponse({
        properties: {
          timeseries: [{ time: isoHourFromNow(1), data: { instant: { details: { air_temperature: 5 } } } }],
        },
      });

      const result = await getForecastOnly(STOCKHOLM, "last-24-hours");
      expect(result.issuedAt).toBeNull();
    });

    it("degrades to empty observations and null issuedAt on a non-ok response", async () => {
      mockResponse({}, false);
      const result = await getForecastOnly(STOCKHOLM, "last-24-hours");
      expect(result).toEqual({ observations: [], issuedAt: null });
    });

    it("degrades to empty observations and null issuedAt when fetch throws", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new Error("network down");
        })
      );
      const result = await getForecastOnly(STOCKHOLM, "last-24-hours");
      expect(result).toEqual({ observations: [], issuedAt: null });
    });

    it("returns no observations for last-30-days (forecast out of scope for that window)", async () => {
      mockResponse({ properties: { meta: { updated_at: "2026-09-06T08:00:00Z" }, timeseries: [] } });
      const result = await getForecastOnly(STOCKHOLM, "last-30-days");
      expect(result).toEqual({ observations: [], issuedAt: null });
    });
  });
});
