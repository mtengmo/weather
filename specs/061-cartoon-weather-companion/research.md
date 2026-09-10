# Phase 0 Research: Cartoon Weather Companion

## 1. Source artwork — what was actually supplied, and is it usable as-is?

**Decision**: Use `docs/weathericons/b883b079-47e5-41c1-99b5-1dce1b1449e7.png` directly as the
source sheet; no re-generation needed.

**Rationale**: Inspected the file (1536×1024, RGBA). Its alpha channel is already cleanly
segmented — ~68% of pixels are fully transparent (alpha < 10), ~28% are fully opaque (alpha > 200,
the character/label artwork), and only a thin anti-aliased edge band sits in between. This is
genuine alpha transparency (consistent with the `vaderikoner-dalle-addendum.md` request for a
transparent background via gpt-image-1), unlike the older SMHI reference sheet
(`symbols_logos_ver6.png`), which baked its "transparent" background in as an opaque checkerboard
and needed flood-fill + edge-feathering to recover real transparency
(`docs/logos/split_symbols_ver6.py`). No such recovery step is needed here — a plain per-cell crop
+ autotrim (bounding box of alpha > 0) is sufficient.

**Alternatives considered**:
- Re-generate the sheet with a cleaner layout (no header row/column baked in) — rejected: the
  supplied sheet is already good enough to crop programmatically (see §2), and re-generating risks
  losing the character consistency the user already achieved across all 25 cells.
- Run a neural background-removal pass (e.g. `rembg`) — unnecessary; the alpha channel is already
  clean, confirmed by direct pixel inspection.

## 2. Grid layout of the source sheet

**Decision**: Crop using these measured pixel boundaries (1536×1024 sheet):

- Header row (temperature-band labels, not a character row): rows 0–94
- Row bands (precipitation categories, top to bottom — matches the spec's/prompt guide's row
  order exactly): Torrt/dry 94–277, Regn/rain 284–470, Åska/thunder 477–651, Slask/sleet 668–841,
  Snö/snow 846–1008
- Label column (precipitation icon + Swedish text, not a character column): columns 67–205
- Column bands (temperature bands, left to right — matches spec order exactly): Extremkallt/frozen
  271–467, Kallt/cold 524–693, Milt/mild 772–933, Varmt/warm 1002–1197, Hett/hot 1256–1467

**Rationale**: Found via content-density profiling — summing `alpha > 40` pixel counts per row/
column and locating the low-density gaps that separate the header/label bands from the 5×5 grid of
character cells. The gaps are wide and unambiguous (near-zero content for 5+ consecutive rows/
columns at each boundary), so fixed pixel offsets are reliable and don't need per-run
recomputation. Row order (Torrt, Regn, Åska, Slask, Snö) and column order (Extremkallt, Kallt,
Milt, Varmt, Hett) match the precipitation-category and temperature-band ordering already used in
`docs/weathericons/vaderikoner-promptguide.md` and in spec.md's Key Entities, so cell
`(row, col)` maps directly to `(precipCategory[row], tempBand[col])` with no reordering.

**Alternatives considered**: Splitting into exact 1/5th fractions of the full sheet — rejected,
since the header row/label column mean the 5 character columns and rows are not evenly spaced
across the full canvas (confirmed by the measured, unequal gap positions above).

## 3. Cropping approach (script)

**Decision**: A Python script (`docs/weathericons/split_character_sheet.py`), following the same
shape as `docs/logos/split_symbols_ver6.py`: for each of the 25 `(row, col)` cells, crop the fixed
pixel rectangle, then autotrim to the alpha>0 bounding box (removing the empty margin so all 25
output PNGs are tightly cropped to their character, ready to be laid out consistently by CSS).
Output filenames follow the reference guide's existing convention:
`character_{precip}_{band}.png` with `precip ∈ {dry, rain, thunder, sleet, snow}` and
`band ∈ {frozen, cold, mild, warm, hot}`.

**Rationale**: Reuses a proven, already-reviewed pattern in this repo rather than inventing a new
one. No flood-fill/feathering step is needed here (see §1), so the script is substantially simpler
than `split_symbols_ver6.py` — just crop + autotrim, no background-color recovery.

**Alternatives considered**: Cropping by hand in an image editor — rejected, error-prone across 25
cells and not reproducible if the source sheet is ever regenerated/replaced.

## 4. Mapping conditions to a character variant

**Decision**: Mirror `smhiSymbolIcons.ts`'s existing resolver-module pattern with a new
`weatherCharacterIcons.ts`: a `Record<PrecipCategory, Record<TempBand, string>>` lookup (25
entries) plus two small pure functions, `mapConditionToPrecipCategory(condition: WeatherCondition)`
and `mapTemperatureToBand(celsius: number)`, composed into one `resolveCharacterIcon(condition,
temperatureCelsius)` entry point that returns the asset path or `null`.

- `WeatherCondition` → precipitation category: `light-rain`/`heavy-rain` → `rain`; `thunderstorm` →
  `thunder`; `sleet` → `sleet`; `light-snow`/`heavy-snow` → `snow`; `clear-day`/`clear-night`/
  `partly-cloudy`/`cloudy`/`foggy` → `dry`; `windy` → `dry` (no dedicated art — spec's Edge Cases
  section already calls this out as the documented fallback).
- Temperature (°C) → band: `< -20` → `frozen`; `-20 to 0` (inclusive lower, exclusive upper, i.e.
  `[-20, 0)`) → `cold`; `[0, 15)` → `mild`; `[15, 25)` → `warm`; `>= 25` → `hot` — the boundary
  value belongs to the warmer of its two adjacent bands, matching spec.md's Edge Cases resolution.

**Rationale**: `deriveWeatherCondition`/`WeatherCondition` is already this app's single source of
truth for "what's the weather doing right now" (used throughout `smhiSymbolIcons.ts`,
`weatherIcons.tsx`, `TodaySummaryCard.tsx` already computes a `condition` for its existing icon) —
reusing it means no new classification logic, matching spec.md's Assumptions section directly.

**Alternatives considered**: Keying directly off SMHI `symbol_code` instead of `WeatherCondition` —
rejected; `TodaySummaryCard` already resolves and holds a `WeatherCondition` value (see
`src/components/TodaySummaryCard.tsx:86-87`), and not every source (Open-Meteo, MET Norway) carries
an SMHI symbol code, whereas `WeatherCondition` is already source-agnostic.

## 5. Where the temperature value comes from for band selection

**Decision**: Prefer `currentTemperature` (today's live "now" reading, already a prop on
`TodaySummaryCard`) when present; fall back to `today.high`/`today.low`'s midpoint when
`currentTemperature` is `null` — directly satisfying spec.md User Story 3's Acceptance Scenario 2
("falls back to the temperature band implied by today's forecast high/low rather than disappearing
outright").

**Rationale**: `currentTemperature` is already the most accurate "right now" reading
`TodaySummaryCard` has (it's what's shown as "Now X°"); the high/low midpoint is the next-best
same-card fallback, requiring no new data fetch.

**Alternatives considered**: Omitting the character whenever `currentTemperature` is `null` —
rejected; spec.md explicitly calls for the high/low fallback instead.

## 6. Placement and layout within `TodaySummaryCard`

**Decision**: Render the character as a second `<img>` element inside (or immediately adjacent to)
the existing `.today-summary-icon` wrapper, sized smaller than or equal to the day/night weather
icon (`size={40}` today), positioned via CSS (flex/absolute) so it sits beside — not on top of —
the icon, with `aria-hidden="true"` (purely decorative, doesn't duplicate the card's existing
textual condition description).

**Rationale**: Matches spec.md FR-001 ("directly beside") and FR-006 (must not crowd existing
text) with the smallest possible change — one new element in one existing component, no new
layout region.

**Alternatives considered**: A new standalone component/section elsewhere on the page — rejected;
spec.md's Assumptions section already settled on "beside the existing hero icon," which is
`TodaySummaryCard`'s icon.
