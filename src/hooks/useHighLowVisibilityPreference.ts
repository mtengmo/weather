import { useCallback, useState } from "react";
import type { HighLowVisibility } from "../models/types";
import { getHighLowVisibility, setHighLowVisibility } from "../services/highLowVisibility";

export interface UseHighLowVisibilityPreferenceResult {
  visible: HighLowVisibility;
  setVisible: (visible: HighLowVisibility) => void;
}

export function useHighLowVisibilityPreference(): UseHighLowVisibilityPreferenceResult {
  const [visible, setVisibleState] = useState<HighLowVisibility>(() => getHighLowVisibility());

  const setVisible = useCallback((next: HighLowVisibility) => {
    setHighLowVisibility(next);
    setVisibleState(next);
  }, []);

  return { visible, setVisible };
}
