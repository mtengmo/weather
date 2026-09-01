import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ObservationSeries, StationInfo } from "../../src/models/types";

vi.mock("../../src/services/smhiProvider", () => ({
  isCovered: vi.fn(),
  getObservations: vi.fn(),
  getNearestStations: vi.fn(),
}));

vi.mock("../../src/services/openMeteoProvider", () => ({
  getObservations: vi.fn(),
  getForecastOnly: vi.fn(),
}));

import * as smhiProvider from "../../src/services/smhiProvider";
import * as openMeteoProvider from "../../src/services/openMeteoProvider";
import { getNearbyStationSeries, getObservations } from "../../src/services/weatherApi";

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
