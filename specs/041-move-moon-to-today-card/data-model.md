# Phase 1 Data Model: Declutter Timeline Header and Move Moon Phase to the Today Card

No new or changed data entities — this feature is a presentation relocation over existing,
already-computed values.

## Existing values touched (unchanged shape)

- **`MoonPhase`** (`src/services/sunMoon.ts`, `getMoonPhase(date)`): unchanged type/logic; only its
  rendering location changes (from `WeatherIconOverview.tsx`'s `SunMoonSummary` to
  `TodaySummaryCard.tsx`).
- **Sunrise/sunset** (`getSunTimes`): unchanged; `TodaySummaryCard.tsx` already calls this
  independently for its own existing Sunrise/Sunset display, which is unaffected.
- **`dataSourceNote`** (`src/services/format.ts`): unchanged function; simply no longer called from
  `WeatherIconOverview.tsx`'s Overview render. Still used by `ObservationChart.tsx` (Details/graph
  view) and conceptually mirrored by the footer's separate `dataSourceDisclosure`, both untouched.

## Presentation-only change

- **Today card's detail row**: `TodaySummaryCard.tsx`'s existing `.today-summary-detail` row
  (currently `Sunrise <time>` / `Sunset <time>`) gains one more span, `Moon <phase>`. No schema —
  purely a rendering change.
