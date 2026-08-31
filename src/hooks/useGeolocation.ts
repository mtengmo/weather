import { useCallback, useState } from "react";
import type { Location } from "../models/types";

export type GeolocationStatus = "idle" | "loading" | "granted" | "denied" | "unavailable";

export interface UseGeolocationResult {
  location: Location | null;
  status: GeolocationStatus;
  request: () => void;
}

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
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          displayName: "Current Location",
          source: "current-position",
        });
        setStatus("granted");
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      }
    );
  }, []);

  return { location, status, request };
}
