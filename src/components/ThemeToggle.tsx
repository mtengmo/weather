import type { Theme } from "../models/types";

interface ThemeToggleProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const OTHER_THEME: Record<Theme, Theme> = {
  midnight: "ivory",
  ivory: "midnight",
};

const THEME_LABEL: Record<Theme, string> = {
  midnight: "Dark",
  ivory: "Light",
};

/**
 * A single always-visible header button that flips the whole app's look between Dark and
 * Light in one tap — no dropdown step (037-header-controls-and-chart-fixes, US1). Replaces
 * the old three-option "Display" menu's theme picker; "Glass" has been removed entirely.
 */
export default function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => onThemeChange(OTHER_THEME[theme])}
    >
      {THEME_LABEL[theme]}
    </button>
  );
}
