# Phase 0 Research: Stop Brief Morning Rain From Marking the Whole Day, and Refresh Weather Icon Artwork

## §1 — Confirming the exact remaining bug after 066

**Finding**: `daytimeAggregateFields` (`src/services/dailyAggregation.ts`) reuses `aggregateBucket`,
whose `totalPrecipitation` is a plain **sum** over every observation in the filtered window — for
the daytime fields, that's the whole 6 AM-8 PM span. `deriveWeatherCondition` then classifies on
`precipitation > 0` (any nonzero amount at all), so a shower confined to two or three morning
hours still produces a nonzero 14-hour sum and triggers a rain classification for the entire day.
This is a distinct bug from what 066 fixed (066 only excluded genuinely overnight hours from the
daytime figures) — it's not a timezone issue (timestamps are UTC `Z` strings;
`new Date(ts).getHours()` correctly resolves to the runtime's local zone either way) and not the
`hasDaytimeData` fallback misfiring (SMHI/Open-Meteo forecast data is dense hourly, so the 6-20
window is never sparse enough to trigger the "no daytime data at all" fallback for this scenario).

**Decision**: Fix this at the same layer 066 already introduced (`dailyAggregation.ts`'s
daytime-field computation + `WeeklyForecastStrip.tsx`'s consumption of it) rather than touching
`deriveWeatherCondition` itself, for the same reason 066 didn't touch it either: that function is
shared by every hourly, sub-day, and whole-day caller, and changing its threshold logic would
regress the (already-correct) hourly and sub-day rain display that this feature must explicitly
leave alone (FR-005).

## §2 — Majority-of-hours vs. sum-based classification

**Decision**: Compute, per rolling-24h bucket, three new derived values from the daytime-filtered
observation subset: `daytimeHourCount` (how many daytime hours have a precipitation reading at
all), `daytimeRainHourCount` (how many of those have measurable rain, i.e. `precipitation > 0`),
and `daytimeMaxHourlyPrecipitation` (the single highest hourly reading in the daytime window).
`WeeklyForecastStrip.tsx` then decides whether the day's rain is "meaningful enough to display" by
two ORed conditions:
- **Majority rule**: `daytimeRainHourCount / daytimeHourCount > 0.5` — rain present in more than
  half the day's daytime hours (Acceptance Scenario 2/SC-002).
- **Heavy-override rule**: `daytimeMaxHourlyPrecipitation >= PRECIPITATION_HEAVY_THRESHOLD_MM` —
  a single hour was heavy enough to matter on its own, regardless of how many hours it spans
  (Acceptance Scenario 3/SC-003 — a brief but heavy event must never be hidden).

If neither holds, the day's precipitation signal fed into `deriveWeatherCondition` is treated as
zero for condition-derivation purposes only — `daytimeTotalPrecipitation` itself (and every other
`DailyAggregate` field) is unchanged, so nothing else that might read the raw sum in the future is
affected.

**Rationale**: A pure "hours majority" rule alone would hide a genuinely severe but brief morning
downpour (failing Acceptance Scenario 3); a pure "any heavy single reading" rule alone would still
let a widespread-but-moderate rain day (majority of hours, each individually under the heavy
threshold) get suppressed incorrectly. The OR of both rules is the minimal combination that
satisfies all three of Acceptance Scenarios 1-3 simultaneously. The `> 0.5` (strict majority, ties
go to "not most") boundary is a reasonable, unambiguous default — the spec's Assumptions
explicitly leave the exact technique to planning, and this is the simplest one that satisfies the
required scenarios.

**Alternatives considered**:
- *Average precipitation intensity across all daytime hours* (rather than counting hours) — would
  naturally dilute a brief spike, but was rejected because it conflates "how much rain fell" with
  "how long it lasted": a genuinely severe short downpour with a large per-hour amount could still
  average out below the heavy threshold across 14 hours, silently failing Acceptance Scenario 3 in
  a way the chosen hour-counting approach doesn't (the heavy-override rule checks the single worst
  hour directly, not a diluted average).
- *Reusing the existing `daytimeChanceOfRainMax` field alone* — rejected because chance-of-rain
  reflects forecast *confidence*, not *duration/coverage*; a single high-confidence hour would
  incorrectly count the same as widespread rain.

## §3 — Exporting the heavy-rain threshold for reuse

**Decision**: Export `PRECIPITATION_HEAVY_THRESHOLD_MM` from `src/services/weatherCondition.ts`
(currently a private module constant), mirroring exactly how `NIGHT_START_HOUR`/`NIGHT_END_HOUR`
were exported in 066 for the same reason: `dailyAggregation.ts`/`WeeklyForecastStrip.tsx` need the
identical value `deriveWeatherCondition` itself uses for heavy-vs-light classification, so the two
can never silently drift apart.

## §4 — Icon re-split: confirming the pipeline is unblocked

**Finding**: The user's replacement source sprite-sheet PNGs already exist in the repo at
`docs/weathericons/01_kvinna-frozen.png` through `19_flicka_nearzero.png` — the exact 19 filenames
`sheet-manifest.json` expects, shown as modified (not untracked) in `git status`, confirming they
were overwritten in place rather than added under new names. `docs/weathericons/icons_split/`
exists but is currently empty. `python`, `pillow`, `numpy`, and `scipy` are all available in this
environment (verified: `python --version` → 3.9.13; `import PIL, numpy, scipy` succeeds).

**Decision**: Run `python split_icons.py` from `docs/weathericons/` with default arguments
(`--sheets-dir` defaults to `.`-relative `sheets/`, which doesn't exist here — the sheets are
directly in `docs/weathericons/` itself, so pass `--sheets-dir .` explicitly), producing 124 files
in `./icons_split/`, then copy them over the existing files in `src/assets/weather-icons-v2/`
(same 124 filenames, verified by count and by diffing the filename sets before overwriting).

**Rationale**: This is the exact same script and manifest 063-replace-weather-icons already
established — no reason to write a new pipeline for a pure source-image refresh. The script's own
output already reports `written/expected` counts and flags any cell where no content was found
(`❌`) or alpha variation looks wrong (`⚠️`), which doubles as this feature's FR-007 coverage check
without any new tooling.

**Alternatives considered**: Writing a small verification script to diff the old and new file
lists — rejected as unnecessary; a plain `ls`/count comparison before and after, plus the
existing test suite (which will fail loudly via `import.meta.glob` picking up a missing file if
any expected artwork is absent) is sufficient given the low complexity of this one-time task.
