import { useTranslation } from "react-i18next";
import type { LanguagePreference } from "../models/types";

interface LanguageToggleProps {
  language: LanguagePreference;
  onChange: (language: LanguagePreference) => void;
}

/** Automatic/English/Svenska language control (066-daily-forecast-language-setting), following
 *  the same button-group shape as `UnitToggle`/`HighLowToggle` rather than a native `<select>`, to
 *  stay visually consistent with this app's other Settings controls. */
export default function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  const { t } = useTranslation();
  return (
    <div className="language-toggle" role="group" aria-label={t("languageToggle.ariaLabel")}>
      <button type="button" aria-pressed={language === "auto"} onClick={() => onChange("auto")}>
        {t("languageToggle.auto")}
      </button>
      <button type="button" aria-pressed={language === "en"} onClick={() => onChange("en")}>
        {t("languageToggle.english")}
      </button>
      <button type="button" aria-pressed={language === "sv"} onClick={() => onChange("sv")}>
        {t("languageToggle.swedish")}
      </button>
    </div>
  );
}
