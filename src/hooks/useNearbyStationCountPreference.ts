import { useCallback, useState } from "react";
import type { NearbyStationCount } from "../models/types";
import {
  getNearbyStationCountPreference,
  setNearbyStationCountPreference,
} from "../services/nearbyStationCount";

export interface UseNearbyStationCountPreferenceResult {
  count: NearbyStationCount;
  setCount: (count: NearbyStationCount) => void;
}

export function useNearbyStationCountPreference(): UseNearbyStationCountPreferenceResult {
  const [count, setCountState] = useState<NearbyStationCount>(() =>
    getNearbyStationCountPreference()
  );

  const setCount = useCallback((next: NearbyStationCount) => {
    setNearbyStationCountPreference(next);
    setCountState(next);
  }, []);

  return { count, setCount };
}
