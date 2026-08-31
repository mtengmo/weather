import type {
  Location,
  NearbyStationCount,
  NearbyStationSeries,
  ObservationSeries,
  ObservationWindow,
  StationInfo,
} from "../models/types";
import * as openMeteoProvider from "./openMeteoProvider";
import * as smhiProvider from "./smhiProvider";

async function isSmhiCovered(location: Pick<Location, "latitude" | "longitude">): Promise<boolean> {
  try {
    return await smhiProvider.isCovered(location);
  } catch {
    return false;
  }
}

export async function getObservations(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<ObservationSeries> {
  if (await isSmhiCovered(location)) {
    try {
      return await smhiProvider.getObservations(location, window);
    } catch {
      // SMHI failed for an in-coverage location — silently fall back to Open-Meteo
      // rather than surfacing an error (the user asked for SMHI *with* a fallback).
    }
  }

  return openMeteoProvider.getObservations(location, window);
}

export async function getNearbyStationSeries(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow,
  count: NearbyStationCount
): Promise<NearbyStationSeries[]> {
  if (count === 0) {
    return [];
  }

  if (!(await isSmhiCovered(location))) {
    return [];
  }

  let stations: StationInfo[];
  try {
    // Fetch one extra: the nearest station is presumed to be the one already used
    // for the location's own series, so it's excluded from the comparison set.
    stations = await smhiProvider.getNearestStations(location, count + 1);
  } catch {
    return [];
  }

  const comparisonStations = stations.slice(1, count + 1);

  const results = await Promise.allSettled(
    comparisonStations.map(async (station): Promise<NearbyStationSeries> => {
      const series = await smhiProvider.getObservations(station, window);
      return { station, series };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<NearbyStationSeries> => r.status === "fulfilled")
    .map((r) => r.value);
}
