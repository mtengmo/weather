import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { sv } from "./sv";

/** Any Swedish regional variant (`sv`, `sv-SE`, `sv-FI`, ...) is treated as Swedish; everything
 *  else falls back to English (064-swedish-translation, research.md §2 — spec.md's Assumptions
 *  explicitly scope out a manual language switcher, so this one-line rule is the whole detection
 *  step). */
export function detectLanguage(): "en" | "sv" {
  const reported = (typeof navigator !== "undefined" && (navigator.languages?.[0] ?? navigator.language)) || "en";
  return reported.toLowerCase().startsWith("sv") ? "sv" : "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    sv: { translation: sv },
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  // Our resource files are flat `{ "component.key": "value" }` maps (data-model.md), not nested
  // objects — disable i18next's default dot-as-nested-path behavior so a key like
  // "app.detailsButton" is looked up literally instead of as `resources.app.detailsButton`.
  keySeparator: false,
  nsSeparator: false,
  interpolation: {
    // React already escapes rendered output — i18next's own HTML-escaping would double-escape it.
    escapeValue: false,
  },
});

export default i18n;
