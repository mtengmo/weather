# Contract: Header Redesign (User Story 1)

## `src/components/DisplayMenu.tsx` (new)

```tsx
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

export default function DisplayMenu({
  theme, onThemeChange, unit, onUnitChange, highLowVisible, onHighLowChange,
}: DisplayMenuProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
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
      <button type="button" aria-expanded={open} aria-controls="display-menu-content" onClick={() => setOpen((v) => !v)}>
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
```

(Identical open/close/outside-click/Escape pattern to `LocationPanel.tsx` — copied, not imported,
since `LocationPanel` has no reusable "dropdown panel" abstraction extracted today; extracting one
is out of scope for a visual redesign.)

## `src/components/ForecastSourcesControl.tsx` (new)

```tsx
import { useEffect, useRef, useState } from "react";

interface ForecastSourcesControlProps {
  combined: boolean;
  onChange: (combined: boolean) => void;
}

export default function ForecastSourcesControl({ combined, onChange }: ForecastSourcesControlProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function select(value: boolean) {
    onChange(value);
    setOpen(false);
  }

  return (
    <div className="forecast-sources-control" ref={panelRef}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Forecast sources: {combined ? "Combined" : "Automatic"}
      </button>
      {open && (
        <ul role="listbox" aria-label="Forecast sources">
          <li>
            <button type="button" aria-selected={!combined} onClick={() => select(false)}>
              Automatic
            </button>
          </li>
          <li>
            <button type="button" aria-selected={combined} onClick={() => select(true)}>
              Combined
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
```

## `src/App.tsx`

```tsx
<header className="app-header">
  <div className="current-conditions">
    <LocationPanel
      currentLocation={currentLocation}
      favorites={favorites}
      favoritesError={favoritesError}
      selected={selected}
      onSelect={selectLocation}
      onAddFavorite={(candidate) => add(candidate)}
      onRemoveFavorite={remove}
      onDismissFavoritesError={clearError}
      geoStatus={geoStatus}
      onRequestCurrentLocation={requestLocation}
      // renders as the location-name control itself now, styled inline (see
      // contracts/timeline-structure.md's sibling CSS note) — same component, same props,
      // just repositioned and restyled per FR-002 ("equivalent to today's Change location").
    />
    {currentConditions !== null && (
      <>
        <span className="current-temperature">
          {formatValue(convertTemperature(currentConditions.temperature, unit), 0)}°
        </span>
        <span className="current-condition-label">
          {currentConditionLabel}
        </span>
        {currentConditions.feelsLike !== null && (
          <span className="current-feels-like">
            Feels like {formatValue(convertTemperature(currentConditions.feelsLike, unit), 0)}°
          </span>
        )}
      </>
    )}
  </div>

  <div className="header-actions">
    <DisplayMenu
      theme={theme} onThemeChange={setTheme}
      unit={unit} onUnitChange={setUnit}
      highLowVisible={highLowVisible} onHighLowChange={setHighLowVisible}
    />
    <ForecastSourcesControl combined={combineForecastSources} onChange={setCombineForecastSources} />
    {view !== "overview" && (
      <NearbyStationCountControl count={nearbyStationCount} onChange={setNearbyStationCount} />
    )}
    {view === "overview" && (
      <button type="button" onClick={() => setView("graph")}>Details</button>
    )}
    <button type="button" onClick={() => setView("map")}>Map</button>
  </div>
</header>
```

`currentConditions` is derived in `App.tsx` from `series`: the last non-forecast observation (or
`null` if none), with `feelsLike` computed via the existing `deriveFeelsLike` service on that same
observation — reusing the exact function `dailyAggregation.ts` already calls per-bucket, just
applied to a single point instead. `currentConditionLabel` reuses
`WEATHER_ICONS[deriveWeatherCondition({...currentConditions, timestamp: currentConditions.timestamp})].label`,
the same derivation `ConditionRow` already performs per timeline column.

## No changes to

- `LocationPanel.tsx`, `ThemePicker.tsx`, `UnitToggle.tsx`, `HighLowToggle.tsx` — reused as-is,
  only their mount point and immediate container change.
- `CombineForecastToggle.tsx` is removed from all call sites (replaced by
  `ForecastSourcesControl.tsx`) but the underlying `useCombineForecastSourcesPreference` hook and
  `combineForecastPreference.ts` service are untouched.
