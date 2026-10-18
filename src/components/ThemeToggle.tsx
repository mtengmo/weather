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
const SWITCH_TO_KEY: Record<Theme, string> = {
  midnight: "themeToggle.switchToDark",
  ivory: "themeToggle.switchToLight",
};

const THEME_LABEL: Record<Theme, string> = {
  midnight: "themeToggle.dark",
  ivory: "themeToggle.light",
};

/**
 * Menu item (inside HeaderMenu) that flips the whole app between Dark and Light. The label states
 * the CURRENT theme ("Theme: Light") and the trailing hint names the action, so it is never
 * ambiguous which one the text describes.
 */
export default function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
  const { t } = useTranslation();
  const nextTheme = OTHER_THEME[theme];
  return (
    <button
      type="button"
      role="menuitem"
      className="theme-toggle header-menu-item"
      onClick={() => onThemeChange(nextTheme)}
    >
      <span>{t("themeToggle.current", { theme: t(THEME_LABEL[theme]) })}</span>
      <span className="header-menu-hint">{t(SWITCH_TO_KEY[nextTheme])}</span>
    </button>
  );
}
