import { useEffect, useRef, useState } from "react";
import type { HighLowVisibility, Theme, UnitSystem } from "../models/types";
import ThemePicker from "./ThemePicker";
import UnitToggle from "./UnitToggle";
import HighLowToggle from "./HighLowToggle";

interface DisplayMenuProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  unit: UnitSystem;
  onUnitChange: (unit: UnitSystem) => void;
  highLowVisible: HighLowVisibility;
  onHighLowChange: (visible: HighLowVisibility) => void;
}

/**
 * Consolidates Theme/Unit/High-Low behind a single "Display" control instead of three
 * always-visible header buttons (018-dashboard-visual-redesign, FR-003) — same dropdown-panel
 * pattern already established by LocationPanel (013).
 */
export default function DisplayMenu({
  theme,
  onThemeChange,
  unit,
  onUnitChange,
  highLowVisible,
  onHighLowChange,
}: DisplayMenuProps) {
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
    <div className="display-menu" ref={panelRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="display-menu-content"
        onClick={() => setOpen((prev) => !prev)}
      >
        Display
      </button>

      {open && (
        <div id="display-menu-content" className="display-menu-content">
          <ThemePicker theme={theme} onChange={onThemeChange} />
          <UnitToggle unit={unit} onChange={onUnitChange} />
          <HighLowToggle visible={highLowVisible} onChange={onHighLowChange} />
        </div>
      )}
    </div>
  );
}
