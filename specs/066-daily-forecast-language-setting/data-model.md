# Phase 1 Data Model: Daytime-Weighted Daily Forecast & Manual Language Setting

## `DailyAggregate` (extended)

Existing entity in `src/models/types.ts`, representing one rolling-24h (or sub-day) bucket of
aggregated weather data. Five new **optional** fields are added, computed identically to their
existing whole-bucket counterparts but over only that bucket's observations whose local hour falls
in `[6, 20)` (daytime, matching `isNight`'s boundary):

| Field | Type | Meaning |
|---|---|---|
| `daytimeAverage` | `number \| null` | Mean temperature across the bucket's daytime-hour observations only |
| `daytimeTotalPrecipitation` | `number \| null` | Sum of precipitation across the bucket's daytime-hour observations only |
| `daytimeWindAverage` | `number \| null` | Mean wind speed across the bucket's daytime-hour observations only |
| `daytimeCloudAverage` | `number \| null` | Mean cloud cover % across the bucket's daytime-hour observations only |
| `daytimeChanceOfRainMax` | `number \| null` | Max forecast chance-of-rain across the bucket's daytime-hour observations only |

**Validation / invariants**:
- All five fields are `null` together only when the bucket has zero observations whose local hour
  falls in `[6, 20)` — never a mix of some-null/some-populated from the same bucket, since they're
  computed from the same filtered observation subset in one pass (mirrors `aggregateBucket`'s
  existing all-or-nothing-per-field behavior when its input array is empty).
- Every existing field on `DailyAggregate` (`high`, `low`, `average`, `totalPrecipitation`, etc.)
  is unchanged in meaning and computation — these are pure additions.
- Only computed by `toDailyAggregates` (whole-day rolling buckets); `toSubDayBuckets`' sub-day
  periods do **not** get these fields — a sub-day period is already narrow enough (≤6 hours) that
  a further daytime/night split within it is meaningless, and `WeeklyForecastStrip` (the only
  consumer) never receives sub-day buckets.

## `LanguagePreference` (new)

A new type in `src/models/types.ts`:

```ts
export type LanguagePreference = "auto" | "en" | "sv";
export const DEFAULT_LANGUAGE_PREFERENCE: LanguagePreference = "auto";
```

Represents the user's chosen display-language mode, persisted the same way as `Theme` and
`UnitSystem` today.

**Storage**: `localStorage` key `"weather-app:language-preference:v1"` (new key, versioned like
the existing `theme-preference:v1`/`unit-preference:v1` keys), holding the raw string value
(`"auto"`, `"en"`, or `"sv"`).

**Validation / invariants**:
- Any stored value outside `["auto", "en", "sv"]` (corrupted storage, a future removed option) is
  treated as absent and falls back to `DEFAULT_LANGUAGE_PREFERENCE` (`"auto"`) — mirrors
  `getThemePreference`'s existing `VALID_THEMES.includes(...)` guard.
- `"auto"` never itself calls `i18n.changeLanguage("auto")` — it resolves through the existing
  `detectLanguage()` (browser-language sniff) to a concrete `"en"`/`"sv"` before being handed to
  i18next, which only ever knows about the two real languages.
- Changing this preference does not alter the `Theme`/`UnitSystem`/other preferences' own stored
  values — a separate, independent localStorage key.
