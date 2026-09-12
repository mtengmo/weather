import { useTranslation } from "react-i18next";
import type { UnitSystem } from "../models/types";

interface UnitToggleProps {
  unit: UnitSystem;
  onChange: (unit: UnitSystem) => void;
}

export default function UnitToggle({ unit, onChange }: UnitToggleProps) {
  const { t } = useTranslation();
  return (
    <div className="unit-toggle" role="group" aria-label={t("unitToggle.ariaLabel")}>
      <button type="button" aria-pressed={unit === "metric"} onClick={() => onChange("metric")}>
        °C / mm
      </button>
      <button
        type="button"
        aria-pressed={unit === "imperial"}
        onClick={() => onChange("imperial")}
      >
        °F / in
      </button>
    </div>
  );
}
