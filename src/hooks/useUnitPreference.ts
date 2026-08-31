import { useCallback, useState } from "react";
import type { UnitSystem } from "../models/types";
import { getUnitPreference, setUnitPreference } from "../services/units";

export interface UseUnitPreferenceResult {
  unit: UnitSystem;
  setUnit: (system: UnitSystem) => void;
}

export function useUnitPreference(): UseUnitPreferenceResult {
  const [unit, setUnitState] = useState<UnitSystem>(() => getUnitPreference());

  const setUnit = useCallback((system: UnitSystem) => {
    setUnitPreference(system);
    setUnitState(system);
  }, []);

  return { unit, setUnit };
}
