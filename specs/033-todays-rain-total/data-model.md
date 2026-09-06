# Data Model: Calendar-Day Rain Total on the Today Card

No new persisted entities. One new derived value:

## `todaysRainTotalMm` (component-local, `WeatherIconOverview.tsx`)

| Field | Type | Notes |
|---|---|---|
| `todaysRainTotalMm` | `number \| null` | `sumCalendarDayPrecipitation(weeklySeries.observations, new Date())` — `null` when there is no non-null precipitation reading anywhere in today's calendar-day span (renders the card's existing "—" gap treatment, per research.md §3). |

## Relationships

```
weeklySeries.observations  (already-fetched 7-day series)
        │
        ▼
sumCalendarDayPrecipitation(observations, now)
        │  filters to [localMidnightStart, localMidnightEnd), sums non-null precipitation
        ▼
todaysRainTotalMm: number | null
        │
        ▼
<TodaySummaryCard todaysRainTotalMm={...} .../>  — rain figure only; every other prop unchanged
```

## Validation rules

- `todaysRainTotalMm` only ever sums observations whose timestamp falls within the current local
  calendar day — never an hour belonging to tomorrow or any later day (FR-003).
- `todaysRainTotalMm` is `null` (not `0`) when no non-null precipitation reading exists anywhere
  in today's span — the card's existing missing-data rendering applies unchanged.
- `today` (the existing `DailyAggregate` used for condition/high/low/wind/sunrise/sunset) is
  never modified by this feature (FR-004).
