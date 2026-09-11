# Phase 0 Research: Replace Weather Icons With Character Artwork

## 1. Where every current icon actually comes from

**Decision**: Treat this as two migrations sharing one resolver, not four independent ones.

**Rationale**: Traced every consumer:
- `WeatherIconOverview.tsx`'s hourly timeline "Weather" row and `ObservationDetails.tsx`'s table
  already use the richer, SMHI-code-aware system (`resolveConditionIconFromCondition` /
  `resolveConditionIcon` in `smhiSymbolIcons.ts`), which already handles a real `smhiSymbolCode`
  when available and falls back to a best-fit code derived from `WeatherCondition`
  (`CONDITION_SMHI_FALLBACK`) otherwise.
- `TodaySummaryCard.tsx` and `WeeklyForecastStrip.tsx` (the Today card and 7-day strip) instead use
  a simpler, generic system (`WEATHER_ICONS` in `weatherIcons.tsx`, plain lucide vector icons keyed
  only by `WeatherCondition` — no SMHI code, no artwork, no day/night distinction at all today).

Both need the same new artwork, so the plan is: make `smhiSymbolIcons.ts`'s existing resolver the
single source for all four consumers — the two SMHI-aware ones keep calling it as before (now
temperature-aware too), and the two lucide-only ones switch to calling it the same
condition-only way `ObservationDetails`/`WeatherIconOverview` already do for a period with no real
code.

**Alternatives considered**: A brand-new, separate module just for the Today card/7-day strip —
rejected; it would duplicate the condition→best-fit-code fallback logic `smhiSymbolIcons.ts`
already has instead of reusing it.

## 2. The source sheets are already correctly generated and already alpha-transparent

**Decision**: Use `docs/weathericons/*.png` and `docs/weathericons/split_icons.py` as-is; only
correct `sheet-manifest.json`'s `input_file` filenames to match the sheets' actual names on disk
(several have small typos/spelling differences from the manifest — see table below). No change to
the splitting script itself.

| Manifest says | Actual filename on disk |
|---|---|
| `01_kvinna_frozen.png` … `06_kvinna_hot.png` | `01_kvinna-frozen.png` … `06_kvinna-hot.png` (hyphen, not underscore, before the band) |
| `07_par_nearzero.png` | `07_par_nerzero.png` |
| `09_par_warm.png` | `09_par_varm.png` |
| `17_flicka_frozen.png` | `17_flicka_fronzen.png` |
| everything else | matches exactly |

**Rationale**: Inspected a sample sheet's pixel data directly (`04_kvinna-mild.png`): background
pixels are already alpha=0 (confirmed at multiple sample points), matching the same clean-alpha
pattern already confirmed for the 061-cartoon-weather-companion source sheet. `split_icons.py`'s
`remove_background` step only ever *adds* transparency to white-and-corner-connected regions and
never touches existing alpha elsewhere in the image — so running it against an already-transparent
sheet is a safe no-op for the background, and it still provides real value as a defensive pass for
any sheet that isn't already clean. No modification to the script is needed.

**Alternatives considered**: Renaming the 19 PNG files to match the manifest instead of editing the
manifest — rejected; editing one small JSON file's string values is less invasive than renaming
binary assets already committed under their current names.

## 3. Consolidating 27 codes into 12 weather types, and 6 temperature bands

**Decision**: Use `sheet-manifest.json`'s `code_mapping` verbatim as the code→weather-type table,
and its implied 6 bands (`frozen` < -20°C, `cold` -20 to -5°C, `nearzero` -5 to 5°C, `mild` 5 to
15°C, `warm` 15 to 25°C, `hot` > 25°C) as the temperature-band function — both already
spec.md-approved, sourced directly from the authoritative manifest the user confirmed.

**Rationale**: This is the artwork's actual coverage — there's no reason to invent a different
consolidation than what was actually generated.

## 4. Preserving existing text labels — only the artwork (`src`) changes

**Decision**: Keep every existing accessible/visible label exactly as it is today — the current
27-entry `SMHI_SYMBOL_ICONS[code].label` table for the SMHI-aware path, and `WEATHER_ICONS[condition].label`
for the sole remaining condition-only fallback (`windy` — see §6). Only replace which image asset
(`src`) is shown for a given code/temperature/day-or-night combination.

**Rationale**: Directly satisfies spec.md's Edge Cases note that codes now sharing one combined
icon (e.g. "light rain showers" code 8 and "light rain" code 18, both now `rain-light` artwork)
must still be distinguishable via their text description. Since the label table is keyed by the
original 27 codes (or 12 conditions), not by the new 12 weather types, nothing about label
resolution needs to change at all — only the artwork lookup underneath it does.

**Alternatives considered**: Collapsing labels down to one per weather type (12 total) — rejected;
would lose real information the spec explicitly requires keeping.

## 5. `windy` keeps its lucide icon — the two-path system survives

**Decision**: Keep `ResolvedConditionIcon`'s existing two-variant shape
(`{kind:"smhi-symbol", src, label} | {kind:"condition", Icon, label}`) unchanged.
`CONDITION_SMHI_FALLBACK` already deliberately has no entry for `windy` (today's `Wind` lucide icon
is a distinct visual cue the existing code chose to keep rather than force onto one of the SMHI
codes) — this feature doesn't touch that decision, since none of the 12 new weather types
represents "windy" either. `windy` is the only condition that still renders via the lucide path
after this feature; everything else (all 27 codes, plus every other condition via
`CONDITION_SMHI_FALLBACK`) renders via the new artwork.

**Rationale**: Minimizes change — reuses an already-tested, deliberate exception instead of
inventing new handling for it.

**Alternatives considered**: Mapping `windy` onto the `dry` weather type (matching how
061-cartoon-weather-companion's separate character system already does this) — rejected; that
would change existing, working, deliberately-chosen behavior with no user-facing benefit, and this
feature's own FR-007 says already-driving condition/temperature logic shouldn't change.

## 6. Every icon now has a real night version — the old 4-code special case goes away

**Decision**: Remove `NIGHT_VARIANT_ICONS` and its "only codes 1-4 have a night variant" special
case entirely. Every one of the new artwork's weather-type/band combinations already has both a
day and a night image (each of the 19 source sheets is 2 rows: day, night) — the lookup simply
picks the matching row, universally, no exceptions.

**Rationale**: The old system only bothered generating night art for the four sun-depicting codes
(a moon looks wrong at night; every other old icon was already night-agnostic, e.g. a plain rain
cloud). The new source art was generated with full day/night pairs for all 12 weather types, so
the special case is now obsolete rather than replaced by a bigger one.

## 7. Where temperature comes from at each of the four call sites

**Decision**:
- `ObservationDetails.tsx`: already passes `obs.temperature` into `resolveConditionIcon`'s input
  object today (for condition derivation) — no call-site change needed, just extend the resolver
  to also use that same field for band selection.
- `WeatherIconOverview.tsx`'s hourly `ConditionRow`: needs a new `temperature` field on
  `TimelinePeriod` (today it only carries `condition`/`smhiSymbolCode`, no raw value) — both
  `buildHourlyTimelineData` and `daysToTimelineData` (in `timelineData.ts`) already have
  `obs.temperature`/`day.average` in scope at the exact point they build each `TimelinePeriod`,
  so this is a same-shape addition mirroring how `smhiSymbolCode` is already populated there.
- `TodaySummaryCard.tsx`: already receives `currentTemperature` (with the existing
  high/low-midpoint fallback this app already established in 061-cartoon-weather-companion for the
  same "no live reading" case) — reuse that exact value.
- `WeeklyForecastStrip.tsx`: already computes `condition` from `day.average` — reuse `day.average`
  directly as the temperature input too.

**Rationale**: Every call site already has (or can trivially reuse) a temperature value in scope;
no new data fetch or prop threading beyond the one new `TimelinePeriod` field is needed anywhere.

**Alternatives considered**: Passing the whole `WeatherObservation`/`DailyAggregate` object into
`TimelinePeriod` instead of a single new field — rejected; a single `temperature: number | null`
field mirrors the existing `smhiSymbolCode` precedent exactly and keeps the type's surface minimal.

## 8. Missing-temperature fallback (spec.md User Story 3)

**Decision**: When temperature is `null` at any of the four call sites, use `"nearzero"` as the
default band (the middle of the 6 bands) rather than omitting the icon.

**Rationale**: A defined, always-available middle-ground default — simpler than deriving a
per-call-site fallback (e.g. a high/low midpoint) for the two call sites (`WeatherIconOverview`,
`ObservationDetails`) that don't already have an established "day's high/low" fallback value
readily at hand the way `TodaySummaryCard` does (061's own fallback is specific to that one
component's already-available `today.high`/`today.low` props, not available inside
`timelineData.ts`/`ObservationDetails.tsx`'s per-observation loop).

**Alternatives considered**: Reusing 061's high/low-midpoint pattern everywhere — rejected for the
two sites that don't have a per-period high/low value in scope; a single, simple default is more
consistent across all four call sites than a per-site-specific rule for what's already a rare edge
case (spec.md's Edge Cases frames missing temperature as an unusual data gap, not a common path).
