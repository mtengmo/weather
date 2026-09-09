# Phase 1 Data Model: 27 Distinct Icons for SMHI's Weather Symbol Codes

## `WeatherObservation` (existing, one field added)

`src/models/types.ts`:

| Field | Change |
|-------|--------|
| `smhiSymbolCode?: number \| null` (**new**) | The raw SMHI `symbol_code` (1-27) for this period, when the observation came from SMHI's own forecast. `null`/absent for every other source (Open-Meteo, MET Norway) and for observed/historical readings, which have no such code. |
| `symbolCondition?: WeatherCondition \| null` (existing) | Unchanged — still the collapsed classification used by `deriveWeatherCondition`'s existing priority rules (guard, windy override, cloud-cover fallback). |

## `SmhiSymbolIconEntry` (new)

`src/components/smhiSymbolIcons.ts`:

```ts
interface SmhiSymbolIconEntry {
  src: string;   // imported image asset path
  label: string; // accessible name / plain-language description, e.g. "Moderate rain showers"
}
```

`SMHI_SYMBOL_ICONS: Record<number, SmhiSymbolIconEntry>` has exactly 27 entries, keyed 1-27,
matching SMHI's own documented `symbol_code` table. No entry is ever partially filled — a code
either has a full `{src, label}` or isn't in the table at all (never reached, since SMHI only ever
returns 1-27, per `data-model.md`/spec Edge Cases falling back to §"no code" handling for any
out-of-range value).

## `TimelinePeriod` (existing, one field added — hourly periods only)

`src/components/timelineData.ts`:

| Field | Change |
|-------|--------|
| `smhiSymbolCode?: number \| null` (**new**) | Copied from the source `WeatherObservation.smhiSymbolCode` when building hourly periods (`buildHourlyTimelineData`). Daily/weekly periods (`daysToTimelineData`) do NOT get this field — per `research.md` §5, a `symbol_code` is an hourly-forecast property with no daily equivalent, so those periods keep resolving their icon via the existing `condition` field alone. |

## Icon-resolution order (new, used by a shared helper — see `research.md` §6)

For a given period (temperature/precipitation/etc. plus optional `smhiSymbolCode` and the existing
`WeatherConditionInput` fields):

1. If `smhiSymbolCode` is present and within 1-27 → resolve via `SMHI_SYMBOL_ICONS[code]`.
2. Otherwise → resolve via existing `deriveWeatherCondition(...)` + `WEATHER_ICONS[condition]`
   (unchanged). This is the only path daily/weekly periods ever take.

## No changes to

- `WeatherCondition` type and `deriveWeatherCondition`'s logic (`src/services/weatherCondition.ts`)
  — per `research.md` §1, this feature is additive, not a replacement.
- `WEATHER_ICONS` (`src/components/weatherIcons.tsx`) — unchanged, still serves the fallback path.
- Any provider other than `smhiProvider.ts` — MET Norway and Open-Meteo have no equivalent
  1-27 numbering, so they never populate `smhiSymbolCode`.
