# Data Model: Split Informational SMHI Warnings Into the Daily Brief

## WeatherWarning (extended)

| Field | Type | Notes |
|---|---|---|
| ...existing fields (`id`, `severityCode`, `severityLabel`, `title`, `areaName`, `description`, `validFrom`, `validUntil`, `isActive`) | — | Unchanged. |
| `isInformational` | `boolean` | **New.** `true` when `severityCode === "MESSAGE"`; `false` for `CLASS_1`/`CLASS_2`/`CLASS_3` (Yellow/Orange/Red). |

## Routing

At `App.tsx` (the single consumer of `getWarningsForLocation`'s result):

- `bannerWarnings = warnings.filter(w => !w.isInformational && !dismissedIds.has(w.id))` → `WarningBanner` (unchanged behavior otherwise).
- `informationalWarnings = warnings.filter(w => w.isInformational)` → threaded through `WeatherIconOverview` → `TodaySummaryCard` (no dismissal filtering — not dismissible).

## TodaySummaryCard (extended)

New optional prop `informationalWarnings?: WeatherWarning[]`. Renders one line per entry (title + description) below the card's existing content, nothing when the array is empty/undefined — matching the card's existing `today === null → return null` convention for "nothing to show."
