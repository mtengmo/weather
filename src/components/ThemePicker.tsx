import type { Theme } from "../models/types";

interface ThemePickerProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

const THEMES: { value: Theme; label: string }[] = [
  { value: "midnight", label: "Midnight" },
  { value: "ivory", label: "Bright" },
  { value: "glass", label: "Glass" },
];

export default function ThemePicker({ theme, onChange }: ThemePickerProps) {
  return (
    <div className="theme-picker" role="group" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t.value}
          type="button"
          aria-pressed={theme === t.value}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
