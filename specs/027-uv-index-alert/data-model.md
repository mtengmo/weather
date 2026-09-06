# Data Model: UV Index Risk Indicator

## New/changed types (`src/models/types.ts` and `src/components/timelineData.ts`)

### `UvRiskHours` (internal, provider-layer return shape)

Not a persisted entity — the in-memory result of one STRÅNG fetch, already reduced to just the
hours that cross the risk threshold.

| Field | Type | Notes |
|---|---|---|
| `riskyHourKeys` | `Set<number>` | Hour-bucket keys (`Math.floor(epochMs / 3600_000)`), the same convention `smhiProvider.ts`'s `byHour` already uses. Only hours with UV Index ≥ 6 are present — absence means "not risky or no data," which are indistinguishable by design (both render as "no badge"). |

### `TimelinePeriod` (existing type, `src/components/timelineData.ts`) — one field added

| Field | Type | Notes |
|---|---|---|
| `uvRisk` | `boolean` | **New.** `true` when any hour within this period's span is a risky hour per `UvRiskHours`. Always `false` for a period with no UV data available (forecast periods, non-Swedish locations, or a failed/empty fetch) — never `null`/`undefined`, so every existing consumer of `TimelinePeriod` that doesn't know about this field keeps working unchanged. |

### `UseObservationDataResult` (existing type, `src/hooks/useObservationData.ts`) — one field added

| Field | Type | Notes |
|---|---|---|
| `uvRiskHours` | `Set<number>` | **New.** Empty set when unavailable/loading/out-of-coverage. Passed down to whichever builder (`buildHourlyTimelineData`, `buildDailyTimelineData`, `build3DayTimelineData`) is producing the currently-active view's `TimelinePeriod[]`. |

## Relationships

```
Location + ObservationWindow
        │
        ▼
smhiProvider.getUvIndex()  →  UvRiskHours (Set<number>, hour-bucket keys)
        │
        ▼
useObservationData()  →  uvRiskHours: Set<number>  (own independent effect/state)
        │
        ▼
timelineData.ts builders  →  TimelinePeriod.uvRisk: boolean  (per period, `.some()` over its hour span)
        │
        ▼
WeatherIconOverview.tsx's ConditionRow  →  small badge rendered on the existing condition icon when uvRisk is true
```

## Validation rules

- A period's `uvRisk` is `true` only when at least one whole hour within `[periodStart,
periodEnd)` is present in `riskyHourKeys` — matches FR-001/FR-003 (threshold-based) and the
Assumptions' "peak reading" rule for aggregated (3-day/7-day) periods.
- `uvRisk` is always `false` (never omitted/undefined) for: any period whose `key` timestamp is
in the future relative to when the UV fetch ran (FR-005 — STRÅNG has no forecast), any period at
a location outside SMHI coverage (FR-005, FR-007 reused convention), and any period during a UV
fetch failure (FR-006).
- No raw UV Index value is ever attached to `TimelinePeriod` or exposed to a component — only
the derived boolean, per the spec's "no numeric display" assumption.
