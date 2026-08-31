import type { UnitSystem } from "../models/types";

interface UnitToggleProps {
  unit: UnitSystem;
  onChange: (unit: UnitSystem) => void;
}

export default function UnitToggle({ unit, onChange }: UnitToggleProps) {
  return (
    <div className="unit-toggle" role="group" aria-label="Unit system">
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
