import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { HighLowVisibility, UnitSystem } from "../models/types";
import UnitToggle from "./UnitToggle";
import HighLowToggle from "./HighLowToggle";

interface SettingsMenuProps {
  unit: UnitSystem;
  onUnitChange: (unit: UnitSystem) => void;
  highLowVisible: HighLowVisibility;
  onHighLowChange: (visible: HighLowVisibility) => void;
}

/**
 * Holds the display options that aren't theme (now its own header button, ThemeToggle) —
 * units and the high/low toggle — behind a single "Settings" control
 * (037-header-controls-and-chart-fixes, US2). Same dropdown-panel pattern the old DisplayMenu
 * used (018-dashboard-visual-redesign, FR-003), minus the theme picker.
 */
export default function SettingsMenu({
  unit,
  onUnitChange,
  highLowVisible,
  onHighLowChange,
}: SettingsMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="settings-menu" ref={panelRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="settings-menu-content"
        onClick={() => setOpen((prev) => !prev)}
      >
        {t("settingsMenu.settings")}
      </button>

      {open && (
        <div id="settings-menu-content" className="settings-menu-content">
          <UnitToggle unit={unit} onChange={onUnitChange} />
          <HighLowToggle visible={highLowVisible} onChange={onHighLowChange} />
        </div>
      )}
    </div>
  );
}
