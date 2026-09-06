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
  /** True once the Details/graph view has been opened at least once this session — nearby-station
   *  comparison data is only ever rendered there, so it's fetched lazily rather than with every
   *  Overview load (025-reduce-api-requests, research.md §1). */
  includeNearbyStations: boolean
): UseObservationDataResult {
  const [series, setSeries] = useState<ObservationSeries | null>(null);
  const [nearbyStations, setNearbyStations] = useState<NearbyStationSeries[]>([]);
  const [multiSourceForecast, setMultiSourceForecast] = useState<MultiSourceForecastEntry[]>([]);
  const [weeklySeries, setWeeklySeries] = useState<ObservationSeries | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSeries(null);
    setMultiSourceForecast([]);
    if (window !== "last-7-days") setWeeklySeries(null);

    if (location === null) return;

    Promise.all([
      getObservations(location, window),
      // Always fetched now — forecast is always a cross-source average when both have data
      // (020-dashboard-polish-round-five, US2; was previously gated behind a user toggle).
      getMultiSourceForecast(location, window),
      // Only a genuinely new fetch when `window` isn't already "last-7-days" — the Today card
      // and 7-day strip need weekly data regardless of which tab is active
      // (018-dashboard-visual-redesign, research.md §4).
      window === "last-7-days" ? Promise.resolve(null) : getObservations(location, "last-7-days"),
    ]).then(([primary, multiSource, weekly]) => {
      if (cancelled) return;
      setSeries(primary);
      setMultiSourceForecast(multiSource);
      setWeeklySeries(window === "last-7-days" ? primary : weekly);
      setLastUpdated(new Date().toISOString());
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, window]);

  // Nearby-station comparison data is fetched independently, only once the Details/graph view has
  // been opened — split into its own effect so flipping `includeNearbyStations` from false to
  // true fetches only this data, not a redundant re-fetch of the primary/weekly/multi-source data
  // above, which is already valid for the same location/window (025-reduce-api-requests, US1).
  useEffect(() => {
    let cancelled = false;

    if (!includeNearbyStations || location === null) {
      setNearbyStations([]);
      return;
    }

    getNearbyStationSeries(location, window, nearbyStationCount).then((nearby) => {
      if (!cancelled) setNearbyStations(nearby);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, window, nearbyStationCount, includeNearbyStations]);

  return { series, nearbyStations, multiSourceForecast, weeklySeries, lastUpdated };
}
