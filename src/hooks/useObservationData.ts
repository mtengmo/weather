import { useEffect, useRef, useState } from "react";
import type {
  Location,
  NearbyStationCount,
  NearbyStationSeries,
  ObservationSeries,
  ObservationWindow,
  WeatherWarning,
} from "../models/types";
import {
  getMultiSourceForecast,
  getNearbyStationSeries,
  getObservations,
  getUvRisk,
  getWarningsForLocation,
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
  /** Hour-bucket keys whose UV Index is at/above the risk threshold — empty outside SMHI
   *  coverage, while loading, or on a failed fetch (027-uv-index-alert). */
  uvRiskHours: Set<number>;
  /** The viewed location's currently-active official weather warnings, most-to-least severe —
   *  empty outside SMHI coverage, while loading, on a failed fetch, or genuinely no active
   *  warning (028-severe-weather-warnings). */
  warnings: WeatherWarning[];
  /** True while a window-only refetch is in flight for a location that already has data — i.e.
   *  `series`/`weeklySeries` are intentionally stale (the *previous* window's data), not `null`,
   *  during this period (042-preserve-scroll-on-window-change). Always `false` during the
   *  initial/location-change load, which already has its own `series === null` loading state.
   *  Consumers may use this for an optional in-place "refreshing" indicator; nothing requires
   *  it. */
  isRefreshing: boolean;
}

// How often to re-fetch the current location's data while the page stays open and visible, so a
// source's own updated forecast reaches the viewer without a manual reload
// (059-periodically-auto-refresh).
const REFRESH_INTERVAL_MS = 15 * 60_000;

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
  const [uvRiskHours, setUvRiskHours] = useState<Set<number>>(new Set());
  const [warnings, setWarnings] = useState<WeatherWarning[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Tracks the location most recently (re)fetched for, so a window-only change (same location)
  // can be told apart from a genuine location change — only the latter should reset `series`/
  // `weeklySeries` to `null` (042-preserve-scroll-on-window-change, research.md §3). A window-only
  // change instead keeps showing the previous window's data until the new fetch resolves, so none
  // of this hook's consumers ever collapse to their "Loading…" state mid-switch.
  const previousLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  // Bumped periodically and whenever the tab regains visibility — included in the main fetch
  // effect's own dependency array below so a tick re-runs it exactly like a window/location
  // change would, reusing that effect's existing stale-data-preserved refresh behavior
  // (059-periodically-auto-refresh) rather than introducing a second fetch path.
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setRefreshTick((t) => t + 1), REFRESH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") setRefreshTick((t) => t + 1);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (location === null) {
      previousLocationRef.current = null;
      setSeries(null);
      setMultiSourceForecast([]);
      setWeeklySeries(null);
      setIsRefreshing(false);
      return;
    }

    const isSameLocationAsBefore =
      previousLocationRef.current !== null &&
      previousLocationRef.current.latitude === location.latitude &&
      previousLocationRef.current.longitude === location.longitude;
    previousLocationRef.current = { latitude: location.latitude, longitude: location.longitude };

    if (isSameLocationAsBefore) {
      setIsRefreshing(true);
    } else {
      // A genuine new-location start — stale data from a different place would be actively
      // wrong to show, so reset exactly as before this feature.
      setSeries(null);
      setMultiSourceForecast([]);
      if (window !== "last-7-days") setWeeklySeries(null);
    }

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
      setIsRefreshing(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, window, refreshTick]);

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

  // UV risk data is fetched independently, in its own effect, so a slow/failed fetch never
  // delays or affects the primary series (027-uv-index-alert, research.md §4) — mirrors the
  // nearby-station effect's own independent-failure pattern above.
  useEffect(() => {
    let cancelled = false;

    if (location === null) {
      setUvRiskHours(new Set());
      return;
    }

    getUvRisk(location, window).then((risky) => {
      if (!cancelled) setUvRiskHours(risky);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, window]);

  // Warnings are location-scoped, not window-scoped (a currently-active warning doesn't depend
  // on which observation window is selected) — its own independent effect, keyed only on
  // location, so switching windows never re-triggers this fetch (028-severe-weather-warnings).
  useEffect(() => {
    let cancelled = false;

    if (location === null) {
      setWarnings([]);
      return;
    }

    getWarningsForLocation(location).then((result) => {
      if (!cancelled) setWarnings(result);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude]);

  return {
    series,
    nearbyStations,
    multiSourceForecast,
    weeklySeries,
    lastUpdated,
    uvRiskHours,
    warnings,
    isRefreshing,
  };
}
