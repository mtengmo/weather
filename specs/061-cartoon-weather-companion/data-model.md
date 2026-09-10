# Phase 1 Data Model: Cartoon Weather Companion

No persisted or transmitted entities — this feature is a pure rendering/asset-selection concern
layered on data the app already holds. Documented here as types/values for the new module.

## `PrecipCategory` (new union type)

```ts
type PrecipCategory = "dry" | "rain" | "thunder" | "sleet" | "snow";
```

Derived from the app's existing `WeatherCondition` (see research.md §4) — never stored, computed
on render.

## `TempBand` (new union type)

```ts
type TempBand = "frozen" | "cold" | "mild" | "warm" | "hot";
```

Derived from a Celsius temperature reading (see research.md §4) — never stored, computed on
render.

## `CHARACTER_ICONS` (new lookup table, mirrors `SMHI_SYMBOL_ICONS`'s shape)

```ts
const CHARACTER_ICONS: Record<PrecipCategory, Record<TempBand, string>>
```

25 entries (5 × 5), each value the bundled asset path for `character_{precip}_{band}.png`
(imported as an ES module, same pattern as every entry in `smhiSymbolIcons.ts`). Fully populated —
every `(PrecipCategory, TempBand)` pair has an entry, so lookup never needs a runtime fallback once
a valid pair is produced (fallback-to-`null` only happens *before* this table, when the source
condition/temperature themselves can't be classified — see FR-005 / research.md §4-5).

## Validation rules

- `mapConditionToPrecipCategory` and `mapTemperatureToBand` are total functions once their input is
  non-null (every `WeatherCondition` maps to a `PrecipCategory`; every finite Celsius number maps
  to a `TempBand`) — no invalid-pair case exists downstream of them.
- The only "no character" case is a `null` `WeatherCondition` (condition itself couldn't be
  derived) — matches spec.md FR-005 / Edge Cases.

## State transitions

None — this is a stateless derivation from existing props (`currentCondition`/`currentTemperature`/
`today.high`/`today.low`), recomputed on every render like the rest of `TodaySummaryCard`.
