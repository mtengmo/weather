import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ObservationSeries, StationInfo } from "../../src/models/types";

vi.mock("../../src/services/smhiProvider", () => ({
  isCovered: vi.fn(),
  getObservations: vi.fn(),
  getForecastOnly: vi.fn(),
  getNearestStations: vi.fn(),
  getUvIndex: vi.fn(),
  getActiveWarnings: vi.fn(),
}));

vi.mock("../../src/services/openMeteoProvider", () => ({
  getObservations: vi.fn(),
  getForecastOnly: vi.fn(),
}));

vi.mock("../../src/services/metNoProvider", () => ({
  getForecastOnly: vi.fn(),
}));

import * as smhiProvider from "../../src/services/smhiProvider";
import * as openMeteoProvider from "../../src/services/openMeteoProvider";
import * as metNoProvider from "../../src/services/metNoProvider";
import {
  getMultiSourceForecast,
  getNearbyStationSeries,
  getObservations,
  getUvRisk,
  getWarningsForLocation,
} from "../../src/services/weatherApi";
import type { RawSmhiWarning } from "../../src/services/smhiProvider";

const location = { latitude: 59.33, longitude: 18.06 };

function series(
  status: ObservationSeries["status"] = "ready",
  observations: ObservationSeries["observations"] = [],
  window: ObservationSeries["window"] = "last-24-hours"
): ObservationSeries {
  return {
    location: { ...location, displayName: "", source: "current-position" },
    window,
    observations,
    status,
  };
}

function forecastPoint(): ObservationSeries["observations"][number] {
  return {
    timestamp: new Date(Date.now() + 3600_000).toISOString(),
    temperature: 5,
    precipitation: 0,
    windSpeed: 3,
    cloudCoverPercent: 40,
    isForecast: true,
  };
}

function station(id: string, distanceKm: number): StationInfo {
  return { id, displayName: `Station ${id}`, distanceKm, latitude: 1, longitude: 1 };
}

describe("weatherApi.getObservations (provider orchestration)", () => {
  beforeEach(() => {
    vi.mocked(smhiProvider.isCovered).mockReset();
    vi.mocked(smhiProvider.getObservations).mockReset();
    vi.mocked(openMeteoProvider.getObservations).mockReset();
    vi.mocked(openMeteoProvider.getForecastOnly).mockReset();
    vi.mocked(openMeteoProvider.getForecastOnly).mockResolvedValue([]);
    vi.mocked(metNoProvider.getForecastOnly).mockReset();
    vi.mocked(metNoProvider.getForecastOnly).mockResolvedValue({ observations: [], issuedAt: null });
  });

  it("uses SMHI when the location is covered", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getObservations).mockResolvedValue(series());

    const result = await getObservations(location, "last-24-hours");

    expect(result.status).toBe("ready");
    expect(smhiProvider.getObservations).toHaveBeenCalledWith(location, "last-24-hours");
    expect(openMeteoProvider.getObservations).not.toHaveBeenCalled();
  });

  it("uses Open-Meteo directly when the location is not covered", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(false);
    vi.mocked(openMeteoProvider.getObservations).mockResolvedValue(series());

    await getObservations(location, "last-24-hours");

    expect(smhiProvider.getObservations).not.toHaveBeenCalled();
    expect(openMeteoProvider.getObservations).toHaveBeenCalledWith(location, "last-24-hours");
  });

  it("silently falls back to Open-Meteo when SMHI fails for a covered location", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getObservations).mockRejectedValue(new Error("smhi down"));
    vi.mocked(openMeteoProvider.getObservations).mockResolvedValue(series());

    const result = await getObservations(location, "last-24-hours");

    expect(result.status).toBe("ready");
    expect(openMeteoProvider.getObservations).toHaveBeenCalledWith(location, "last-24-hours");
  });

  it("treats an isCovered failure as not-covered", async () => {
    vi.mocked(smhiProvider.isCovered).mockRejectedValue(new Error("station list unreachable"));
    vi.mocked(openMeteoProvider.getObservations).mockResolvedValue(series());

    await getObservations(location, "last-24-hours");

    expect(openMeteoProvider.getObservations).toHaveBeenCalled();
  });

  describe("primarySource (013-overview-default-and-layout)", () => {
    it("is 'smhi' when SMHI serves the location", async () => {
      vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
      vi.mocked(smhiProvider.getObservations).mockResolvedValue(series());

      const result = await getObservations(location, "last-24-hours");

      expect(result.primarySource).toBe("smhi");
    });

    it("is 'open-meteo' when the location isn't SMHI-covered", async () => {
      vi.mocked(smhiProvider.isCovered).mockResolvedValue(false);
      vi.mocked(openMeteoProvider.getObservations).mockResolvedValue(series());

      const result = await getObservations(location, "last-24-hours");

      expect(result.primarySource).toBe("open-meteo");
    });

    it("is 'open-meteo' when SMHI fails for an in-coverage location", async () => {
      vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
      vi.mocked(smhiProvider.getObservations).mockRejectedValue(new Error("smhi down"));
      vi.mocked(openMeteoProvider.getObservations).mockResolvedValue(series());

      const result = await getObservations(location, "last-24-hours");

      expect(result.primarySource).toBe("open-meteo");
    });
  });
});

describe("weatherApi.getObservations forecast-only fallback (006-forecast-now-marker)", () => {
  beforeEach(() => {
    vi.mocked(smhiProvider.isCovered).mockReset();
    vi.mocked(smhiProvider.getObservations).mockReset();
    vi.mocked(openMeteoProvider.getForecastOnly).mockReset();
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
  });

  it("does not call the fallback when SMHI's result already has forecast points", async () => {
    vi.mocked(smhiProvider.getObservations).mockResolvedValue(series("ready", [forecastPoint()]));

    const result = await getObservations(location, "last-24-hours");

    expect(openMeteoProvider.getForecastOnly).not.toHaveBeenCalled();
    expect(result.forecastFromFallbackSource).toBeFalsy();
  });

  it("merges Open-Meteo's forecast onto SMHI's observed data and flags the source when SMHI has none", async () => {
    const smhiSeries = series("ready", []);
    vi.mocked(smhiProvider.getObservations).mockResolvedValue(smhiSeries);
    vi.mocked(openMeteoProvider.getForecastOnly).mockResolvedValue([forecastPoint()]);

    const result = await getObservations(location, "last-24-hours");

    expect(openMeteoProvider.getForecastOnly).toHaveBeenCalledWith(location, "last-24-hours");
    expect(result.forecastFromFallbackSource).toBe(true);
    expect(result.observations.some((o) => o.isForecast)).toBe(true);
    expect(result.location).toEqual(smhiSeries.location);
    // Observed data still came from SMHI even though the forecast fell back (013).
    expect(result.primarySource).toBe("smhi");
  });

  it("leaves the flag unset and adds nothing when the fallback also finds no forecast", async () => {
    vi.mocked(smhiProvider.getObservations).mockResolvedValue(series("ready", []));
    vi.mocked(openMeteoProvider.getForecastOnly).mockResolvedValue([]);

    const result = await getObservations(location, "last-24-hours");

    expect(result.forecastFromFallbackSource).toBeFalsy();
    expect(result.observations).toEqual([]);
  });

  it("never attempts the fallback for last-30-days", async () => {
    vi.mocked(smhiProvider.getObservations).mockResolvedValue(series("ready", [], "last-30-days"));

    await getObservations(location, "last-30-days");

    expect(openMeteoProvider.getForecastOnly).not.toHaveBeenCalled();
  });
});

describe("Automatic forecast-source preference (019-dashboard-polish-round-four, FR-010)", () => {
  beforeEach(() => {
    vi.mocked(smhiProvider.isCovered).mockReset();
    vi.mocked(smhiProvider.getObservations).mockReset();
    vi.mocked(openMeteoProvider.getForecastOnly).mockReset();
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
  });

  it("uses SMHI's own forecast whenever the location is SMHI-covered and SMHI provides one, never blending in Open-Meteo", async () => {
    vi.mocked(smhiProvider.getObservations).mockResolvedValue(series("ready", [forecastPoint()]));

    const result = await getObservations(location, "last-24-hours");

    expect(openMeteoProvider.getForecastOnly).not.toHaveBeenCalled();
    expect(result.primarySource).toBe("smhi");
    expect(result.forecastFromFallbackSource).toBeFalsy();
  });

  it("falls back to Open-Meteo's forecast only when SMHI's own forecast is entirely empty", async () => {
    vi.mocked(smhiProvider.getObservations).mockResolvedValue(series("ready", []));
    vi.mocked(openMeteoProvider.getForecastOnly).mockResolvedValue([forecastPoint()]);

    const result = await getObservations(location, "last-24-hours");

    expect(openMeteoProvider.getForecastOnly).toHaveBeenCalled();
    expect(result.forecastFromFallbackSource).toBe(true);
  });

  it("threads SMHI's forecastIssuedAt through onto the returned series when SMHI supplies its own forecast", async () => {
    vi.mocked(smhiProvider.getObservations).mockResolvedValue({
      ...series("ready", [forecastPoint()]),
      forecastIssuedAt: "2026-09-05T06:00:00.000Z",
    });

    const result = await getObservations(location, "last-24-hours");

    expect(result.forecastIssuedAt).toBe("2026-09-05T06:00:00.000Z");
  });
});

describe("weatherApi.getNearbyStationSeries", () => {
  beforeEach(() => {
    vi.mocked(smhiProvider.isCovered).mockReset();
    vi.mocked(smhiProvider.getNearestStations).mockReset();
    vi.mocked(smhiProvider.getObservations).mockReset();
  });

  it("returns an empty array when count is 0, without any network call", async () => {
    const result = await getNearbyStationSeries(location, "last-24-hours", 0);

    expect(result).toEqual([]);
    expect(smhiProvider.isCovered).not.toHaveBeenCalled();
    expect(smhiProvider.getNearestStations).not.toHaveBeenCalled();
  });

  it("returns an empty array when the location is not SMHI-covered", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(false);

    const result = await getNearbyStationSeries(location, "last-24-hours", 4);

    expect(result).toEqual([]);
    expect(smhiProvider.getNearestStations).not.toHaveBeenCalled();
  });

  it("fetches up to the requested count of nearby stations, excluding the nearest (primary) one", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    const stations = Array.from({ length: 6 }, (_, i) => station(String(i), i));
    vi.mocked(smhiProvider.getNearestStations).mockResolvedValue(stations);
    vi.mocked(smhiProvider.getObservations).mockResolvedValue(series());

    const result = await getNearbyStationSeries(location, "last-24-hours", 4);

    expect(result).toHaveLength(4);
    expect(result.map((r) => r.station.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("omits a station whose fetch fails without affecting the others", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    const stations = Array.from({ length: 6 }, (_, i) => station(String(i), i));
    vi.mocked(smhiProvider.getNearestStations).mockResolvedValue(stations);
    vi.mocked(smhiProvider.getObservations).mockImplementation(async (loc) => {
      if ((loc as StationInfo).id === "2") throw new Error("station fetch failed");
      return series();
    });

    const result = await getNearbyStationSeries(location, "last-24-hours", 4);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.station.id)).not.toContain("2");
  });

  it("resolves to an empty array rather than throwing when the station list fetch fails", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getNearestStations).mockRejectedValue(new Error("list unreachable"));

    const result = await getNearbyStationSeries(location, "last-24-hours", 4);

    expect(result).toEqual([]);
  });
});

describe("weatherApi.getMultiSourceForecast (014-dashboard-usability-fixes, US7; MET Norway added 022-met-forecast-source; SMHI branch switched to getForecastOnly 025-reduce-api-requests)", () => {
  beforeEach(() => {
    vi.mocked(smhiProvider.isCovered).mockReset();
    vi.mocked(smhiProvider.getObservations).mockReset();
    vi.mocked(smhiProvider.getForecastOnly).mockReset();
    vi.mocked(openMeteoProvider.getForecastOnly).mockReset();
    vi.mocked(metNoProvider.getForecastOnly).mockReset();
    vi.mocked(metNoProvider.getForecastOnly).mockResolvedValue({ observations: [], issuedAt: null });
  });

  it("never calls the full smhiProvider.getObservations (025-reduce-api-requests, US2)", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getForecastOnly).mockResolvedValue({
      observations: [forecastPoint()],
      issuedAt: null,
    });
    vi.mocked(openMeteoProvider.getForecastOnly).mockResolvedValue([forecastPoint()]);

    await getMultiSourceForecast(location, "last-24-hours");

    expect(smhiProvider.getObservations).not.toHaveBeenCalled();
    expect(smhiProvider.getForecastOnly).toHaveBeenCalledWith(location, "last-24-hours");
  });

  it("returns both sources when both SMHI and Open-Meteo have forecast data", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getForecastOnly).mockResolvedValue({
      observations: [forecastPoint()],
      issuedAt: null,
    });
    vi.mocked(openMeteoProvider.getForecastOnly).mockResolvedValue([forecastPoint()]);

    const result = await getMultiSourceForecast(location, "last-24-hours");

    expect(result.map((r) => r.source).sort()).toEqual(["open-meteo", "smhi"]);
  });

  it("returns all three sources when SMHI, Open-Meteo, and MET Norway all have forecast data", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getForecastOnly).mockResolvedValue({
      observations: [forecastPoint()],
      issuedAt: null,
    });
    vi.mocked(openMeteoProvider.getForecastOnly).mockResolvedValue([forecastPoint()]);
    vi.mocked(metNoProvider.getForecastOnly).mockResolvedValue({
      observations: [forecastPoint()],
      issuedAt: "2026-09-06T08:00:00.000Z",
    });

    const result = await getMultiSourceForecast(location, "last-24-hours");

    expect(result.map((r) => r.source).sort()).toEqual(["met-no", "open-meteo", "smhi"]);
    const metNoEntry = result.find((r) => r.source === "met-no");
    expect(metNoEntry?.issuedAt).toBe("2026-09-06T08:00:00.000Z");
  });

  it("omits MET Norway alone when it fails, keeping the other two sources", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getForecastOnly).mockResolvedValue({
      observations: [forecastPoint()],
      issuedAt: null,
    });
    vi.mocked(openMeteoProvider.getForecastOnly).mockResolvedValue([forecastPoint()]);
    vi.mocked(metNoProvider.getForecastOnly).mockRejectedValue(new Error("met.no down"));

    const result = await getMultiSourceForecast(location, "last-24-hours");

    expect(result.map((r) => r.source).sort()).toEqual(["open-meteo", "smhi"]);
  });

  it("omits SMHI when the location isn't SMHI-covered, without failing the whole call", async () => {
    const point = forecastPoint();
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(false);
    vi.mocked(openMeteoProvider.getForecastOnly).mockResolvedValue([point]);

    const result = await getMultiSourceForecast(location, "last-24-hours");

    expect(result).toEqual([{ source: "open-meteo", observations: [point], issuedAt: null }]);
    expect(smhiProvider.getForecastOnly).not.toHaveBeenCalled();
  });

  it("omits a source that rejects, without failing the other", async () => {
    const point = forecastPoint();
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getForecastOnly).mockRejectedValue(new Error("smhi down"));
    vi.mocked(openMeteoProvider.getForecastOnly).mockResolvedValue([point]);

    const result = await getMultiSourceForecast(location, "last-24-hours");

    expect(result).toEqual([{ source: "open-meteo", observations: [point], issuedAt: null }]);
  });

  it("returns an empty array when neither source has forecast data", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getForecastOnly).mockResolvedValue({ observations: [], issuedAt: null });
    vi.mocked(openMeteoProvider.getForecastOnly).mockResolvedValue([]);

    const result = await getMultiSourceForecast(location, "last-24-hours");

    expect(result).toEqual([]);
  });

  it("carries SMHI's issuedAt onto its entry, and always null for Open-Meteo (019-dashboard-polish-round-four)", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getForecastOnly).mockResolvedValue({
      observations: [forecastPoint()],
      issuedAt: "2026-09-05T06:00:00.000Z",
    });
    vi.mocked(openMeteoProvider.getForecastOnly).mockResolvedValue([forecastPoint()]);

    const result = await getMultiSourceForecast(location, "last-24-hours");

    const smhiEntry = result.find((r) => r.source === "smhi");
    const openMeteoEntry = result.find((r) => r.source === "open-meteo");
    expect(smhiEntry?.issuedAt).toBe("2026-09-05T06:00:00.000Z");
    expect(openMeteoEntry?.issuedAt).toBeNull();
  });
});

// A square containing `location` (59.33, 18.06) — [lon, lat] order, per GeoJSON.
const COVERING_SQUARE = {
  type: "Polygon" as const,
  coordinates: [
    [
      [17, 58],
      [19, 58],
      [19, 60],
      [17, 60],
      [17, 58],
    ],
  ],
};

const FAR_AWAY_SQUARE = {
  type: "Polygon" as const,
  coordinates: [
    [
      [100, 10],
      [101, 10],
      [101, 11],
      [100, 11],
      [100, 10],
    ],
  ],
};

function rawWarning(overrides: {
  id?: number;
  code?: string;
  approximateStart?: string;
  approximateEnd?: string;
  geometry?: typeof COVERING_SQUARE;
}): RawSmhiWarning {
  return {
    id: overrides.id ?? 1,
    event: { sv: "Storm", en: "Storm", code: "STORM" },
    warningAreas: [
      {
        id: 100 + (overrides.id ?? 1),
        approximateStart: overrides.approximateStart ?? new Date(Date.now() - 3600_000).toISOString(),
        ...(overrides.approximateEnd ? { approximateEnd: overrides.approximateEnd } : {}),
        areaName: { sv: "Stockholms län", en: "Stockholm County" },
        warningLevel: { sv: "Klass 1", en: "Class 1", code: overrides.code ?? "CLASS_1" },
        descriptions: [{ title: { sv: "T", en: "Title" }, text: { sv: "B", en: "Body" } }],
        area: { type: "Feature", geometry: overrides.geometry ?? COVERING_SQUARE },
      },
    ],
  };
}

describe("weatherApi.getWarningsForLocation (028-severe-weather-warnings)", () => {
  beforeEach(() => {
    vi.mocked(smhiProvider.isCovered).mockReset();
    vi.mocked(smhiProvider.getActiveWarnings).mockReset();
  });

  it("returns [] without calling getActiveWarnings when the location isn't SMHI-covered", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(false);

    const result = await getWarningsForLocation(location);

    expect(result).toEqual([]);
    expect(smhiProvider.getActiveWarnings).not.toHaveBeenCalled();
  });

  it("excludes a warning whose area doesn't contain the location", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getActiveWarnings).mockResolvedValue([
      rawWarning({ geometry: FAR_AWAY_SQUARE }),
    ]);

    const result = await getWarningsForLocation(location);

    expect(result).toEqual([]);
  });

  it("excludes a warning whose approximateStart is in the future", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getActiveWarnings).mockResolvedValue([
      rawWarning({ approximateStart: new Date(Date.now() + 3600_000).toISOString() }),
    ]);

    const result = await getWarningsForLocation(location);

    expect(result).toEqual([]);
  });

  it("excludes a warning whose approximateEnd is in the past", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getActiveWarnings).mockResolvedValue([
      rawWarning({
        approximateStart: new Date(Date.now() - 7200_000).toISOString(),
        approximateEnd: new Date(Date.now() - 3600_000).toISOString(),
      }),
    ]);

    const result = await getWarningsForLocation(location);

    expect(result).toEqual([]);
  });

  it("includes a currently-valid warning covering the location, mapped to the reduced shape", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getActiveWarnings).mockResolvedValue([rawWarning({})]);

    const result = await getWarningsForLocation(location);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      severityCode: "CLASS_1",
      severityLabel: "Class 1",
      title: "Storm",
      areaName: "Stockholm County",
    });
  });

  it("sorts multiple active warnings most-to-least severe", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getActiveWarnings).mockResolvedValue([
      rawWarning({ id: 1, code: "MESSAGE" }),
      rawWarning({ id: 2, code: "CLASS_3" }),
      rawWarning({ id: 3, code: "CLASS_1" }),
    ]);

    const result = await getWarningsForLocation(location);

    expect(result.map((w) => w.severityCode)).toEqual(["CLASS_3", "CLASS_1", "MESSAGE"]);
  });

  it("sorts an unrecognized severity code below every recognized one", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    vi.mocked(smhiProvider.getActiveWarnings).mockResolvedValue([
      rawWarning({ id: 1, code: "SOMETHING_NEW" }),
      rawWarning({ id: 2, code: "MESSAGE" }),
    ]);

    const result = await getWarningsForLocation(location);

    expect(result.map((w) => w.severityCode)).toEqual(["MESSAGE", "SOMETHING_NEW"]);
  });
});

describe("weatherApi.getUvRisk (027-uv-index-alert)", () => {
  beforeEach(() => {
    vi.mocked(smhiProvider.isCovered).mockReset();
    vi.mocked(smhiProvider.getUvIndex).mockReset();
  });

  it("returns an empty Set without calling smhiProvider.getUvIndex when the location isn't SMHI-covered", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(false);

    const result = await getUvRisk(location, "last-24-hours");

    expect(result.size).toBe(0);
    expect(smhiProvider.getUvIndex).not.toHaveBeenCalled();
  });

  it("delegates to smhiProvider.getUvIndex when the location is covered", async () => {
    vi.mocked(smhiProvider.isCovered).mockResolvedValue(true);
    const risky = new Set([123456]);
    vi.mocked(smhiProvider.getUvIndex).mockResolvedValue(risky);

    const result = await getUvRisk(location, "last-24-hours");

    expect(result).toBe(risky);
    expect(smhiProvider.getUvIndex).toHaveBeenCalledWith(location, "last-24-hours");
  });
});
