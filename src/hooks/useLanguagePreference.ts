import { useCallback, useEffect, useState } from "react";
import type { LanguagePreference } from "../models/types";
import { getLanguagePreference, setLanguagePreference } from "../services/language";
import i18n, { detectLanguage } from "../i18n";

export interface UseLanguagePreferenceResult {
  language: LanguagePreference;
  setLanguage: (language: LanguagePreference) => void;
}

/** Resolves "auto" to a concrete i18next language via the same browser-detection
 *  064-swedish-translation already performs; a manual "en"/"sv" choice is used as-is
 *  (066-daily-forecast-language-setting). */
function resolveI18nLanguage(preference: LanguagePreference): "en" | "sv" {
  return preference === "auto" ? detectLanguage() : preference;
}

export function useLanguagePreference(): UseLanguagePreferenceResult {
  const [language, setLanguageState] = useState<LanguagePreference>(() => getLanguagePreference());

  useEffect(() => {
    void i18n.changeLanguage(resolveI18nLanguage(language));
  }, [language]);

  const setLanguage = useCallback((next: LanguagePreference) => {
    setLanguagePreference(next);
    setLanguageState(next);
  }, []);

  return { language, setLanguage };
}
