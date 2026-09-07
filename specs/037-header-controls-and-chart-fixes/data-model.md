# Data Model: Header Controls Cleanup and Chart Bug Fixes

Mostly UI/preference-default changes with no new persisted entities. One new data structure:

## TemperatureBand

One row of the fixed 11-band color table (User Story 6), defined in `src/services/temperatureColorScale.ts`.

| Field | Type | Description |
|---|---|---|
| `maxC` | `number \| null` | Inclusive upper bound in °C for this band; `null` for the open-ended hottest band (≥ +31°C) |
| `label` | `string` | Human-readable band name (e.g. "Frost") — for documentation/tests, not rendered in the UI |
| `color` | `string` | Hex color |

The table is ordered coldest-to-hottest; the first band's implicit lower bound is `-Infinity` (≤ −15°C).

**Invariants**:
- Exactly 11 entries, strictly increasing `maxC` (except the final `null`), each step exactly 5°C apart.
- No gaps: every real number maps to exactly one band (`v <= band.maxC`, first match wins; the last band with `maxC: null` always matches).

## Changed defaults (existing types, no shape change)

| Constant | File | Old | New |
|---|---|---|---|
| `Theme` (type) | `models/types.ts` | `"midnight" \| "ivory" \| "glass"` | `"midnight" \| "ivory"` |
| `DEFAULT_HIGH_LOW_VISIBLE` | `models/types.ts` | `true` | `false` |
| `DEFAULT_NEARBY_STATION_COUNT` | `models/types.ts` | `4` | `0` |

No changes to `ObservationSeries`, `WeatherObservation`, `DailyAggregate`, or any other existing entity.
