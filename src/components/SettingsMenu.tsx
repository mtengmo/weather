import type { ReactNode } from "react";
import type { HighLowVisibility, LanguagePreference, UnitSystem } from "../models/types";
import UnitToggle from "./UnitToggle";
import HighLowToggle from "./HighLowToggle";
import LanguageToggle from "./LanguageToggle";

interface SettingsMenuProps {
  unit: UnitSystem;
  onUnitChange: (unit: UnitSystem) => void;
  highLowVisible: HighLowVisibility;
  onHighLowChange: (visible: HighLowVisibility) => void;
  language: LanguagePreference;
  onLanguageChange: (language: LanguagePreference) => void;
  /** Extra controls rendered after the standard ones (e.g. nearby-station count on Details). */
  children?: ReactNode;
}

/**
 * The display options — units, high/low, language — rendered inside the header menu's Settings
 * panel (the dropdown trigger itself now lives in HeaderMenu).
 */
export default function SettingsMenu({
  unit,
  onUnitChange,
  highLowVisible,
  onHighLowChange,
  language,
  onLanguageChange,
  children,
}: SettingsMenuProps) {
  return (
    <div id="settings-menu-content" className="settings-menu-content">
      <UnitToggle unit={unit} onChange={onUnitChange} />
      <HighLowToggle visible={highLowVisible} onChange={onHighLowChange} />
      <LanguageToggle language={language} onChange={onLanguageChange} />
      {children}
    </div>
  );
}
