import { useEffect, useState } from "react";
import type {
  Location,
  NearbyStationCount,
  NearbyStationSeries,
  ObservationSeries,
  ObservationWindow,
} from "../models/types";
import {
  getMultiSourceForecast,
  getNearbyStationSeries,
  getObservations,
  type MultiSourceForecastEntry,
} from "../services/weatherApi";

export interface UseObservationDataResult {
  series: ObservationSeries | null; // null while loading
  nearbyStations: NearbyStationSeries[];
  multiSourceForecast: MultiSourceForecastEntry[];
}

export function useObservationData(
  location: Location | null,
  window: ObservationWindow,
  nearbyStationCount: NearbyStationCount,
  combineForecastSources = false
): UseObservationDataResult {
  const [series, setSeries] = useState<ObservationSeries | null>(null);
  const [nearbyStations, setNearbyStations] = useState<NearbyStationSeries[]>([]);
  const [multiSourceForecast, setMultiSourceForecast] = useState<MultiSourceForecastEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    setSeries(null);
    setNearbyStations([]);
    setMultiSourceForecast([]);

    if (location === null) return;

    Promise.all([
      getObservations(location, window),
      getNearbyStationSeries(location, window, nearbyStationCount),
      // Only fetched when the toggle is on — mirrors the nearbyStationCount===0 fast path above
      // (014-dashboard-usability-fixes, FR-013).
      combineForecastSources ? getMultiSourceForecast(location, window) : Promise.resolve([]),
    ]).then(([primary, nearby, multiSource]) => {
      if (cancelled) return;
      setSeries(primary);
      setNearbyStations(nearby);
      setMultiSourceForecast(multiSource);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, window, nearbyStationCount, combineForecastSources]);

  return { series, nearbyStations, multiSourceForecast };
}
