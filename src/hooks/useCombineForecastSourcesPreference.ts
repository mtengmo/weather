import { useCallback, useState } from "react";
import {
  getCombineForecastSourcesPreference,
  setCombineForecastSourcesPreference,
} from "../services/combineForecastPreference";

export interface UseCombineForecastSourcesPreferenceResult {
  combineForecastSources: boolean;
  setCombineForecastSources: (value: boolean) => void;
}

export function useCombineForecastSourcesPreference(): UseCombineForecastSourcesPreferenceResult {
  const [combineForecastSources, setState] = useState<boolean>(() =>
    getCombineForecastSourcesPreference()
  );

  const setCombineForecastSources = useCallback((value: boolean) => {
    setCombineForecastSourcesPreference(value);
    setState(value);
  }, []);

  return { combineForecastSources, setCombineForecastSources };
}
