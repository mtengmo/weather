import { useCallback, useState } from "react";
import type { Location } from "../models/types";
import { getNearestStations } from "../services/smhiProvider";
import { reverseGeocode } from "../services/geocoding";

export type GeolocationStatus = "idle" | "loading" | "granted" | "denied" | "unavailable";

export interface UseGeolocationResult {
  location: Location | null;
  status: GeolocationStatus;
  request: () => void;
}

// Same fallback text used for a nearby comparison station with no usable name
// (004-chart-styling-fixes) — reused here so "Current Location" never appears (FR-008).
const UNNAMED_STATION = "Unnamed station";

export function useGeolocation(): UseGeolocationResult {
  const [location, setLocation] = useState<Location | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>("idle");

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }

    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation({
          ...coords,
          // Placeholder until the nearest station resolves below; also the final value if
          // resolution fails or finds no usable name (005-add-weather-forecast).
          displayName: UNNAMED_STATION,
          source: "current-position",
        });
        setStatus("granted");

        // A human-recognizable place name is preferred over the nearest weather station's own
        // raw name (032-dashboard-polish-round-seven, US2, research.md §3) — both are fetched
        // independently (one's failure never blocks the other) and resolved together so the
        // location's name is only ever set once, directly to the best available name, rather
        // than risking a later, worse update overwriting an already-good one.
        Promise.allSettled([reverseGeocode(coords), getNearestStations(coords, 1)]).then(
          ([placeResult, stationResult]) => {
            const placeName = placeResult.status === "fulfilled" ? placeResult.value : null;
            const stationName =
              stationResult.status === "fulfilled" ? stationResult.value[0]?.displayName : undefined;

            const name = placeName ?? (stationName && stationName !== UNNAMED_STATION ? stationName : null);
            if (!name) return;

            setLocation((current) =>
              current && current.source === "current-position" ? { ...current, displayName: name } : current
            );
          }
        );
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      }
    );
  }, []);

  return { location, status, request };
}
