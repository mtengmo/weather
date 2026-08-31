# Contract: Unit Preference Service (`services/units.ts`)

Internal module contract for resolving and applying the display unit system (FR-015, [research.md](../research.md) §7, [data-model.md](../data-model.md) `UnitSystem`).

## Functions

```ts
type UnitSystem = "metric" | "imperial";

function getDefaultUnitSystem(locale: string): UnitSystem

function getUnitPreference(): UnitSystem // reads manual override if set, else locale default

function setUnitPreference(system: UnitSystem): void // persists manual override

function convertTemperature(celsius: number | null, to: UnitSystem): number | null
function convertPrecipitation(mm: number | null, to: UnitSystem): number | null
```

### `getDefaultUnitSystem(locale)`

- Maps a BCP-47 locale string to `"imperial"` for US-affiliated locales (e.g., `en-US`) and `"metric"` for all others. Pure function, no I/O.

### `getUnitPreference()`

- Reads a manual override from `localStorage` if present; otherwise calls `getDefaultUnitSystem(navigator.language)`. Never throws — falls back to `"metric"` if locale detection is unavailable.

### `setUnitPreference(system)`

- Persists the chosen system to `localStorage` under a dedicated key (separate from the favorites key). Takes effect immediately for the current session and on future loads.

### `convertTemperature` / `convertPrecipitation`

- Pure conversion functions. **MUST pass `null` through unchanged** (never convert a data gap into `0` or any numeric value) — preserves FR-010 gap semantics through unit conversion.
- `convertTemperature(c, "metric")` and `convertPrecipitation(mm, "metric")` are identity functions (input is already metric per [contracts/weather-service.md](./weather-service.md)).

### Postconditions

- Applying `convertTemperature`/`convertPrecipitation` to every point in an `ObservationSeries.observations` is the only place unit conversion happens — `weatherApi.ts` always returns metric values, so there is exactly one conversion boundary in the app.
