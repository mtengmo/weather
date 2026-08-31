import { useCallback, useEffect, useState } from "react";
import type { Theme } from "../models/types";
import { applyTheme, getThemePreference, setThemePreference } from "../services/theme";

export interface UseThemePreferenceResult {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export function useThemePreference(): UseThemePreferenceResult {
  const [theme, setThemeState] = useState<Theme>(() => getThemePreference());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemePreference(next);
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}
