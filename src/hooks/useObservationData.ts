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
  /** Always the last-7-days series, for the persistent Today card / 7-day strip — reuses
   *  `series` when `window` is already "last-7-days" rather than double-fetching
   *  (018-dashboard-visual-redesign, research.md §4). */
  weeklySeries: ObservationSeries | null;
  /** ISO timestamp of when `series` last finished loading, for the footer's "Updated HH:MM"
   *  (018-dashboard-visual-redesign, research.md §6). */
  lastUpdated: string | null;
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
  const [weeklySeries, setWeeklySeries] = useState<ObservationSeries | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSeries(null);
    setNearbyStations([]);
    setMultiSourceForecast([]);
    if (window !== "last-7-days") setWeeklySeries(null);

    if (location === null) return;

    Promise.all([
      getObservations(location, window),
      getNearbyStationSeries(location, window, nearbyStationCount),
      // Only fetched when the toggle is on — mirrors the nearbyStationCount===0 fast path above
      // (014-dashboard-usability-fixes, FR-013).
      combineForecastSources ? getMultiSourceForecast(location, window) : Promise.resolve([]),
      // Only a genuinely new fetch when `window` isn't already "last-7-days" — the Today card
      // and 7-day strip need weekly data regardless of which tab is active
      // (018-dashboard-visual-redesign, research.md §4).
      window === "last-7-days" ? Promise.resolve(null) : getObservations(location, "last-7-days"),
    ]).then(([primary, nearby, multiSource, weekly]) => {
      if (cancelled) return;
      setSeries(primary);
      setNearbyStations(nearby);
      setMultiSourceForecast(multiSource);
      setWeeklySeries(window === "last-7-days" ? primary : weekly);
      setLastUpdated(new Date().toISOString());
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, window, nearbyStationCount, combineForecastSources]);

  return { series, nearbyStations, multiSourceForecast, weeklySeries, lastUpdated };
}
