# Research: Dashboard Polish Round Five

## §1 — 3-day/7-day observations missing for 00:00-06:00 (US1 / FR-001)

**Decision (confirmed root cause)**: `subDayBucketsForDate` (`src/services/dailyAggregation.ts`)
builds a day's 5 periods from `dayStart = midnight of that calendar day`. Its Night period spans
`startHour: 21` to `endHour: 30`, i.e. `[dayStart+21h, dayStart+30h)` — **that day's** 21:00
through **the next day's** 06:00. `toSubDayBuckets` only ever generates buckets for `dayOffset =
0 .. dayCount-1` (today and days ahead), never a "yesterday" bucket set. The result: **today's
own 00:00-06:00 window has no period at all** — it isn't covered by today's Night period (which
starts at today 21:00, forward only) and there's no "yesterday" bucket generated to claim it via
its own forward-reaching Night period. Any observation timestamped in that 6-hour window is
silently excluded from every column, every day, regardless of when the page is viewed — appearing
as "observations not working" for that stretch of the day.

**Fix**: Add a bucket for the Night period that *ends* at each rendered day's own start, i.e., for
`dayOffset = 0`, also include the period `[today 00:00, today 06:00)` by generating one extra
"leading" Night-continuation period from *yesterday's* start before iterating `dayOffset = 0
.. dayCount-1`, OR — simpler and consistent with existing period semantics — redefine the
generated set so day 0's own Night period covers `[today 21:00 - 24h, today 21:00) = [yesterday
21:00, today 21:00)`... Concretely: shift each day's Night bucket to represent *the night ending
that morning* rather than *the night starting that evening* — i.e. Night's boundary becomes
`startHour: -3` (21:00 the previous day) `endHour: 6`, so day 0's Night period is `[today 00:00 -
3h... ` — the exact boundary arithmetic is an implementation detail for the tasks phase; the
functional requirement is that every hour of every rendered day (including 00:00-06:00) maps to
exactly one of that day's 5 periods, matching the existing "never fabricate, never drop real data"
convention this function already follows for every other hour.

**Rationale**: This is a genuine, permanent data-coverage gap (not a test artifact) — confirmed by
re-deriving the exact boundary math, not by guessing. It equally affects the 3-day view (reported)
and would affect a hypothetical "yesterday" bucket if one were ever added; today's report is
specific to 3-day because that's the view where sub-day granularity makes the gap visible as
missing columns rather than a smoothed-over daily average.

## §2 — Remove the forecast-source picker; always-averaged forecast, SMHI-first observations (US2 / FR-002 through FR-004)

**Decision**: Delete `src/components/ForecastSourcesControl.tsx`,
`src/hooks/useCombineForecastSourcesPreference.ts`, and
`src/services/combineForecastPreference.ts` entirely. `useObservationData.ts` always calls
`getMultiSourceForecast` (dropping its current `combineForecastSources` conditional — mirrors how
its `weeklySeries` fetch is already unconditional). `ObservationChart.tsx` and
`WeatherIconOverview.tsx` always run `mergeMultiSourceIntoTimelinePoints`/the equivalent combined
rendering path, dropping the `combineForecastSources &&` guard — averaging happens whenever 2+
sources have data for a period, exactly as it already does today when the toggle is on. `App.tsx`
no longer renders `<ForecastSourcesControl>` or threads `combineForecastSources` through props.

`weatherApi.ts`'s existing SMHI-primary / Open-Meteo-forecast-fallback `getObservations` logic is
already exactly "SMHI whenever covered, Open-Meteo fallback otherwise" (confirmed unchanged in
019) — no further change needed for FR-004.

**Rationale**: The spec explicitly asks to remove user-facing choice, not to change the
underlying averaging math (019 already implemented cross-source averaging correctly) — this is a
deletion/simplification, not new logic.

**Alternatives considered**: Keeping the components but hard-coding their props — rejected as
dead code; deleting is cleaner and matches this session's established practice (018's
`CombineForecastToggle` removal).

## §3 — "Now" line and day-boundary line mis-positioned since 018 (US3 / FR-005)

**Decision (confirmed root cause)**: `.weather-timeline-now` and `.weather-timeline-day-boundary`
are positioned via inline `left: X%`, computed in `WeatherIconOverview.tsx` as a fraction of
`timeline.periods.length` — but their CSS positioning parent, `.weather-timeline`
(`position: relative`), spans the *entire* row width **including** the 018-introduced 7rem sticky
label column (`.weather-timeline-row-title`). Every actual data column lives in
`.weather-timeline-row-grid-cells`, which only starts *after* that 7rem gutter. The percentage
math was never updated when 018 introduced the sticky column, so both overlay lines have been
positioned as if columns start at the container's left edge (x=0) when they actually start 7rem
in — a fixed leftward offset that becomes a larger *relative* misalignment on narrower views (3
columns wide's local misalignment is proportionally worse than a wider view's), which is why the
3-day view's day-boundary line reads as clearly wrong while the same-root-cause "Now" line issue
is less obviously broken elsewhere. This is a layout bug, not an actual timezone/date bug — the
user's "different timezone" impression is a reasonable guess from the visual symptom (a line
sitting over the wrong column), not the actual cause.

**Fix**: Compute both overlay elements' `left` using `calc(7rem + (100% - 7rem) * fraction)`
instead of a bare `${fraction * 100}%`, so the percentage resolves against the actual data-column
width, matching the technique `.weather-timeline-sections`' `padding-left: 7rem` already uses
correctly for the Observed/Forecast split.

**Rationale**: Matches FR-005 exactly, and — since both overlays share the identical root
cause — fixes the "Now" marker's same latent misalignment as a natural consequence, at no extra
cost, improving consistency without expanding the spec's stated scope.

## §4 — Consolidated, consistent navigation (US4 / FR-006, FR-007)

**Decision (confirmed current state)**: Three different, inconsistent navigation conventions
exist today:
- **Overview** (`WeatherIconOverview.tsx`, already correct since 018): a visually-hidden `<h2>`
  (kept only for the existing focus-on-navigate a11y convention); no local nav buttons; relies
  entirely on `App.tsx`'s persistent header.
- **Graph** (`ObservationChart.tsx`): a *visible* `<h2>{location.displayName}</h2>` (now a
  duplicate of the persistent header's own location name), plus "View details"/"Overview" buttons
  mixed into its window-toggle row.
- **Details** (`ObservationDetails.tsx`): its own local `.app-header`-styled div with a *visible*
  `<h2>{location.displayName} — details</h2>`, plus separate "Back to graph" and "Overview"
  buttons in that local mini-header.

**Fix**: Bring Graph and Details in line with Overview's already-correct pattern — visually-hide
their own `<h2>` (kept for a11y focus, not visible duplication), and move their navigation
actions into `App.tsx`'s persistent `header-actions`, extending its existing conditional-render
convention (the same one already used for the Overview-only "Details" button and the Map
"Back"/"Map" toggle introduced in 019):

- `view === "overview"`: "Details" button → graph (unchanged).
- `view === "graph"`: "Details" button → details (renamed from "View details" for label
  consistency with the Overview's own "Details" button); "Back" button → **overview** (replacing
  the graph's local "Overview" button — same destination, consistent label).
- `view === "details"`: "Back" button → **overview** (replacing *both* the local "Back to graph"
  and "Overview" buttons with one consistently-labeled, consistently-targeted control, per the
  literal request "add back, to start instead of overview").
- Map's existing "Back"/"Map" toggle (019) is unchanged — already the pattern being extended to
  the other two views.

This makes "Back" mean exactly one thing everywhere in the app: return to the Overview. The
graph↔details drill-down (today's "View details"/"Back to graph" pair) collapses into the
already-existing "Details" button doing double duty (from Overview *or* from Graph, it always
means "go to Details"), with "Back" as the universal way out.

**Rationale**: Directly satisfies FR-006 (Details' back control lands on Overview) and FR-007
(consistent controls across all three pages) using a mechanism (App-level conditional
header-actions) already proven by 019's Map "Back" addition, rather than inventing a new
navigation pattern.

**Alternatives considered**: Keeping "Back to graph" as a *second* control alongside a new
Overview-targeting "Back" — rejected as adding yet another inconsistency (two "back-like" buttons
with different destinations) instead of resolving one.

## §5 — Weekly forecast-brief strip capped at 7, forward-prioritized (US5 / FR-008)

**Decision**: `WeatherIconOverview.tsx`'s `weeklyDays` (feeding `WeeklyForecastStrip`) currently
uses `capForecastReach(toDailyAggregates(...), 7)` (019) — capping only the *forecast* portion,
which can still yield up to 7 observed + 7 forecast = 14 cards total, matching what the user is
now reporting as "14d, just show 7d." Change this specific call site (not `buildDailyTimelineData`
— the main 7-day *timeline*, which intentionally keeps its Observed/Forecast dual-section design
and is not what "the forecast brief" refers to) to a strict 7-entry window anchored on "today,"
extending forward first: keep today plus up to 6 forecast days; only backfill with observed
history if forecast reach is shorter than 6 days. This is the "anchor around today" approach
`019`'s research.md explicitly considered and rejected *for the timeline* (to avoid changing the
Observed/Forecast section design there) — but the weekly *strip* has no such dual-section design
to protect, so it's the right fit here specifically.

**Rationale**: Matches FR-008 and the user's explicit "just show 7d" ask for this specific
element, without touching `buildDailyTimelineData`'s own (correct, differently-scoped)
forecast-reach cap from 019.

## §6 — Single, unambiguous forecast freshness (US6 / FR-009)

**Decision**: With Automatic/Combined removed (§2), `dataSourceDisclosure`'s per-mode text
("SMHI observations · SMHI forecast (updated HH:MM)") needs to change: forecast is now always
potentially a blend of both sources, so naming a single "forecast source" is no longer accurate.
Reword to describe the *observation* source (still meaningful — SMHI or its Open-Meteo fallback)
separately from a single averaged-forecast freshness time. Freshness rule (per spec Assumption):
prefer SMHI's own `forecastIssuedAt` (already threaded through since 019) when SMHI contributed to
the forecast; otherwise fall back to the app's own `lastUpdated` fetch-completion time — the same
"most authoritative available signal, one value" rule 019 already established, just no longer
conditioned on which mode was selected.

**Rationale**: Directly satisfies FR-009's "single, unambiguous" requirement; reuses 019's
already-built `forecastIssuedAt` plumbing rather than adding new data flow.

## §7 — Condition icons on the Details page (US7 / FR-010)

**Decision (confirmed current state)**: Neither `ObservationChart.tsx` (graph) nor
`ObservationDetails.tsx` (details) render any weather-condition icon today — only
`WeatherIconOverview.tsx`'s `ConditionRow` does. Add a "Condition" column to
`ObservationDetails.tsx`'s existing table (24-hour window only, matching that table's own
existing scope), deriving each row's icon via the same `deriveWeatherCondition` +
`WEATHER_ICONS` pair `ConditionRow` already uses, at the same icon size (28px) for visual
consistency.

**Rationale**: "Align timeline icons on all pages" only makes sense as "add the icons the
Overview has to the page that's missing them," since there's nothing to visually realign — the
Details page has no icon presentation to compare against today.

**Alternatives considered**: Adding icons to `ObservationChart.tsx`'s graph view too — out of
scope; the user specifically named "the details pages" and a line/bar chart has no natural per-row
icon slot the way a table does.

## §8 — Mobile usability pass (US8 / FR-011)

**Decision**: No code changes decided at planning time — this user story is a verification pass.
The implementation task will drive the app at common phone viewport widths (360-430px, portrait)
via Playwright against the dev server, walking through the primary flows (location select, tab
switch, Details, Map), and fix whatever concrete issues are found (the task list will capture
findings as they're discovered rather than guessing at fixes now).

**Rationale**: Matches this session's established practice of live-verifying visual/layout
behavior instead of guessing (as was necessary for §3 and the 019 rain-bar bug) — mobile viewport
bugs are exactly the kind of thing jsdom-based tests can't catch and planning-time speculation
risks fixing the wrong thing.
