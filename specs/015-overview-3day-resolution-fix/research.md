# Research: Overview Resolution Split and High/Low Fix

## §1 — Un-mixing the 7-day view's resolution (User Story 1)

**Decision**: Revert `buildDailyTimelineData` (`src/components/timelineData.ts`) to call `toDailyAggregates` directly again (as it did before 014's User Story 8), instead of `toSubDayAndDailyBuckets`. Remove `toSubDayAndDailyBuckets` from `dailyAggregation.ts` entirely — its sole purpose was mixing today/tomorrow's sub-day buckets into the 7-day view, which is exactly the behavior being removed.

**Rationale**: The mixing was introduced in 014 specifically to add sub-day detail to the 7-day view; the user has now explicitly asked for it to stop mixing there. `toDailyAggregates` itself was never modified by 014 (only wrapped), so reverting to it directly restores the exact pre-014 daily-resolution behavior with zero risk of subtly different math.

**Alternatives considered**: Keep `toSubDayAndDailyBuckets` and add a flag to disable the mixing — rejected as needless complexity once nothing calls it with mixing enabled; a dead code path serving no caller is worse than removing it.

## §2 — Where the 3-day view's sub-day detail lives (User Story 2)

**Decision**: Add `toSubDayBuckets(observations, dayCount)` to `dailyAggregation.ts`, generalizing the existing `subDayBucketsForDate`/`SUB_DAY_PERIODS` helpers (kept as-is) to loop over `dayCount` consecutive days starting from "today," each broken into the same 5 fixed sub-day periods — with **no** daily-resolution tail mixed in, unlike the removed `toSubDayAndDailyBuckets`. A day beyond how far the underlying observations' forecast actually reaches is omitted entirely (mirrors `toDailyAggregates`' own established "never fabricate a future day beyond the data" rule, reused here as "never fabricate a future day's 5 sub-day columns").

**Rationale**: Reuses 100% of the per-bucket aggregation math and period-boundary logic 014 already built and tested (`aggregateBucket`, `SUB_DAY_PERIODS`) — only the "which days get sub-day treatment" question changes (now: every day in the view, not just the first two of a mixed view).

**Alternatives considered**: A dedicated 3-day-only fetch — rejected; unnecessary, since the app's `last-7-days` fetch already contains 3+ days of data whenever any is available, and a second fetch would violate SC-004 (no extra fetches).

## §3 — Where the "3-day" option lives without a new fetch (User Story 2, SC-004)

**Decision**: `WeatherIconOverview.tsx` keeps its own **local** display-mode state (`"last-24-hours" | "last-3-days" | "last-7-days"`) for its window toggle UI, separate from the `window: ObservationWindow` prop it already receives from `App.tsx` for data-fetching. Selecting "Last 3 days" or "Last 7 days" both call the existing `onWindowChange("last-7-days")` (so the shared fetch state — and the classic graph's own window, if the user later switches views — settles on `last-7-days` either way), while the Overview's own local display mode decides whether to render `build3DayTimelineData` or `buildDailyTimelineData` against that same fetched series. Selecting "Last 24 hours" calls `onWindowChange("last-24-hours")` as it already does today.

**Rationale**: `ObservationWindow` (`src/models/types.ts`) is a shared type consumed by `weatherApi.ts`, both providers' `WINDOW_HOURS`/`FORECAST_HOURS`/`SMHI_PERIOD` maps, and the classic graph's own window toggle. Adding a new value to it would ripple through all of those for a capability that is, by this feature's own scope (FR-006), Overview-only — and would risk the classic graph unexpectedly gaining (or needing to reject) a `last-3-days` option it was never asked to support. Keeping "3-day vs. 7-day" as a purely client-side display choice over already-fetched data avoids all of that, and directly satisfies SC-004 (switching between the three Overview options never fetches more than switching between the previous two did).

**Alternatives considered**: Extending `ObservationWindow` with `"last-3-days"` — rejected for the ripple-effect and scope-leak reasons above. A separate `useObservationData` call scoped to 3 days — rejected as a redundant fetch for data the 7-day fetch already contains.

## §4 — High/Low investigation (User Story 3)

**Decision**: Treat this as a regression-guard through the resolution-split refactor above, not a new root-cause fix. Live testing during planning (dev server + Playwright, Stockholm, 7-day view, High/Low on) confirmed every day's temperature cell already renders correctly as `"<avg>°C (<high>°/<low>°)"` — e.g. `18 °C (22°/14°)` — using the code as it stands after the 2026-09-03 `afd83a0` fix (which corrected `toSubDayAndDailyBuckets`'s today/tomorrow bucket-matching, a bug that could plausibly have produced missing or wrong high/low values on some days before that fix reached production). The 24-hour view was also tested and, as documented in 014's own spec (Assumptions, User Story 4), never shows high/low — there is no day-level high/low concept for a single hour. The most plausible explanation for the "not working" report is that the toggle was checked while viewing the 24-hour Overview (the view the app lands on by default), where it has never had any effect.

**Rationale**: Re-deriving or redesigning a working mechanism would be wasted effort and risks introducing a new defect. The actionable next step is ensuring the mechanism keeps working identically after `buildDailyTimelineData` reverts to plain `toDailyAggregates` (§1) and after the new `build3DayTimelineData` (§2) is introduced — both of which reuse the exact same `RowSource.high`/`.low` → `TimelineRowPoint.high`/`.low` → `LineRow` rendering path already proven to work, so no code change to that path itself is needed; only test coverage confirming it survives the refactor.

**Alternatives considered**: Auditing `convertTemperature`, `formatValue`, or the `LineRow` rendering condition for a subtler bug — done as part of this research; no defect found in any of them (see live test transcript: `18 °C (22°/14°)` matches the underlying `DailyAggregate.high`/`.low` exactly, unit-converted correctly).

## §5 — Fill-width behavior for the 3-day view

**Decision**: Extend the existing `.weather-timeline-fill` treatment (014, `width: 100%` override) to the 3-day view as well as the 7-day view, rather than 7-day only.

**Rationale**: The 3-day view has 15 columns (3 days × 5 periods) — comparable in column count to the 7-day view's 7 — and would leave the same kind of empty space on a wide screen that 014 fixed for the 7-day view if left at `width: max-content`. Nothing in the spec asks for this specifically, but leaving the 3-day view narrow while its sibling views both fill the screen would read as an inconsistency, not a deliberate design choice.

**Alternatives considered**: Leaving the 3-day view unfilled — rejected as inconsistent with the rest of the Overview's now-established fill-on-wide-screens behavior.
