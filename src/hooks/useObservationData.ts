import { useEffect, useState } from "react";
import type {
  Location,
  NearbyStationCount,
  NearbyStationSeries,
  ObservationSeries,
  ObservationWindow,
} from "../models/types";
import { getNearbyStationSeries, getObservations } from "../services/weatherApi";

export interface UseObservationDataResult {
  series: ObservationSeries | null; // null while loading
  nearbyStations: NearbyStationSeries[];
}

export function useObservationData(
  location: Location | null,
  window: ObservationWindow,
  nearbyStationCount: NearbyStationCount
): UseObservationDataResult {
  const [series, setSeries] = useState<ObservationSeries | null>(null);
  const [nearbyStations, setNearbyStations] = useState<NearbyStationSeries[]>([]);

  useEffect(() => {
    let cancelled = false;
    setSeries(null);
    setNearbyStations([]);

    if (location === null) return;

    Promise.all([
      getObservations(location, window),
      getNearbyStationSeries(location, window, nearbyStationCount),
    ]).then(([primary, nearby]) => {
      if (cancelled) return;
      setSeries(primary);
      setNearbyStations(nearby);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, window, nearbyStationCount]);

  return { series, nearbyStations };
}
