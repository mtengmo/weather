import { useTranslation } from "react-i18next";
import type { Theme } from "../models/types";

interface ThemeToggleProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const OTHER_THEME: Record<Theme, Theme> = {
  midnight: "ivory",
  ivory: "midnight",
};

// Translation KEYS, not display text — translated at render via `t(...)` (064-swedish-translation).
const THEME_LABEL: Record<Theme, string> = {
  midnight: "themeToggle.dark",
  ivory: "themeToggle.light",
};

/**
 * A single always-visible header button that flips the whole app's look between Dark and
 * Light in one tap — no dropdown step (037-header-controls-and-chart-fixes, US1). Replaces
 * the old three-option "Display" menu's theme picker; "Glass" has been removed entirely.
 *
 * Labeled with the theme you'll switch *to*, not the current one — e.g. while the app looks
 * dark, the button reads "Light" (037 follow-up: "the Light/Dark switch should be opposite").
 */
export default function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
  const { t } = useTranslation();
  const nextTheme = OTHER_THEME[theme];
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => onThemeChange(nextTheme)}
    >
      {t(THEME_LABEL[nextTheme])}
    </button>
  );
}
