import { useCallback, useState } from "react";
import type { Location } from "../models/types";
import { getNearestStations } from "../services/smhiProvider";

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

        // Reuses the same nearest-station lookup that already names nearby comparison
        // stations, independent of SMHI's 50km data-coverage gate (research.md §6) — a
        // naming-lookup failure must not block the location from becoming usable.
        getNearestStations(coords, 1)
          .then((stations) => {
            const name = stations[0]?.displayName;
            if (!name) return;
            setLocation((current) =>
              current && current.source === "current-position"
                ? { ...current, displayName: name }
                : current
            );
          })
          .catch(() => {
            // Keep the "Unnamed station" placeholder.
          });
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      }
    );
  }, []);

  return { location, status, request };
}
