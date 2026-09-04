# Research: Dashboard Visual Redesign

## §1 — "Forecast sources" selector scope (User Story 1)

**Decision**: Replace `CombineForecastToggle`'s two-button "on"/"off" UI with a single dropdown,
`ForecastSourcesControl`, offering exactly two options: "Automatic" (today's off state — a single
source with its existing SMHI-preferred, Open-Meteo-fallback behavior) and "Combined" (today's on
state — averaged across every available source, per-source lines shown alongside). The underlying
preference stays the same boolean (`combineForecastPreference.ts`, `combineForecastSources` state)
— only its presentation changes, from two buttons to one dropdown with two named options.

**Rationale**: The mockup's "Forecast sources: Combined ▾" implies a picker with more than one
named choice, but the app only has two real forecast providers and no existing mechanism to force
a specific single one — building that would mean new fetch-orchestration logic
(`weatherApi.ts` would need a "get exactly this source, no fallback" mode) well beyond a visual
redesign's scope, and 018's own spec Assumptions explicitly say "the underlying combined-average
behavior itself is unchanged, only how it's chosen." Two clearly-named options (Automatic /
Combined) satisfies FR-004's "a choice...including a combined option" without inventing new data
behavior.

**Alternatives considered**: A three-option dropdown (SMHI only / Open-Meteo only / Combined) —
rejected for this round; would require `weatherApi.getObservations` to accept a forced-source
parameter, a genuine new capability outside "redesign the UI, don't change what it does."

## §2 — Observed/Forecast section labels and the "Now" marker (User Story 2)

**Decision**: A new row inserted above the existing time-label row, spanning two `<div>`s sized via
inline `flex-basis` percentages derived from `nowBoundaryIndex` — `Observed` sized to
`((nowBoundaryIndex + 1) / periods.length) * 100%`, `Forecast` sized to the remainder. When
`nowBoundaryIndex` is `null` (no forecast at all), only the `Observed` label renders, full width.
The existing `.weather-timeline-now` marker (currently a dashed line with a small label) is
restyled as a filled pill/badge — a CSS-only change, same DOM element and position logic.

**Rationale**: Reuses `nowBoundaryIndex`, a value every timeline builder already produces — no new
data needed. Sizing via percentages (rather than `grid-column` spans tied to exact period counts)
keeps this row decoupled from the exact column count, which already varies by `displayMode` (24
hourly columns, up to 15 sub-day columns, or 7-14 daily columns).

**Alternatives considered**: A `grid-template-columns` split matching the exact boundary column —
rejected as more fragile across the three very different column counts than a simple percentage
split, for no visible difference (both produce the same boundary position).

## §3 — Sticky row-label column (User Story 3)

**Decision**: Change each row's layout from today's stacked column (`.weather-timeline-row-title`
above its `PeriodGrid`) to a row-based flex layout (`.weather-timeline-row-title` beside its
`PeriodGrid`), with the title given `position: sticky; left: 0` plus an opaque background. Since
`sticky` positions relative to the nearest scrolling ancestor — `.weather-timeline-wrap`, which is
already the horizontal-scroll container — every row's title pins to the left edge of the visible
viewport as the row's own data scrolls underneath it, with zero JavaScript. A fixed width (e.g.
`7rem`) is applied to every title so all rows' data columns start at the same horizontal offset,
keeping every row's columns aligned with each other (the same pixel-alignment guarantee 008's
original `PeriodGrid` design already relies on). The time-label and condition rows, which today
have no left title stub, gain an empty (zero-content) sticky placeholder of the same width so
every row's data starts at an identical offset.

Each metric row also gains an optional sub-label under its unit, shown in the same sticky column:
Rain gets "Probability," Wind gets "Gusts" — a purely presentational addition (a hardcoded string
per row, passed as a new prop), not a new data field, since the values these sub-labels describe
(`chanceOfRain`, `gust`) already render per-cell exactly as they do today.

**Rationale**: `position: sticky` achieves the effect with no structural DOM split (e.g. two
synchronized-scroll panes), no new scroll-sync JavaScript, and no risk of the alignment drift that
sank the column-width bug found in 013 — reusing the grid's own existing column math untouched.

**Alternatives considered**: Two side-by-side scroll containers (a fixed label pane + an
independently-scrolled data pane, synced via a scroll listener) — rejected; `position: sticky`
gets the identical visual result with far less code and no synchronization to get wrong.

## §4 — Always-available weekly data for the summary cards (User Stories 4 & 5)

**Decision**: `useObservationData` gains a `weeklySeries: ObservationSeries | null` return value.
When the hook's own `window` argument is already `"last-7-days"` (the 3-day/7-day tabs, which
already share that fetch per 015), `weeklySeries` is simply the same `series` already fetched — no
extra request. When `window` is `"last-24-hours"`, the hook additionally fetches
`getObservations(location, "last-7-days")` in parallel with the primary fetch, so the Today card
and 7-day strip always have data regardless of which tab's detailed timeline is currently showing.
Both `TodaySummaryCard` and `WeeklyForecastStrip` derive their data from
`toDailyAggregates(weeklySeries.observations, 7)` — the exact same function the 7-day timeline
already uses, no new aggregation function. "Today" is the last non-forecast entry (or the final
entry if there's no forecast at all) in that array, the same `boundaryIndex`-style rule
`timelineData.ts` already applies elsewhere.

**Rationale**: Satisfies the spec's own Edge Case ("must not require an additional
location-changing data fetch beyond what the app already fetches for the active time window")
as literally as possible — the only *new* fetch is the weekly one when the 24h tab is active, and
even that is skipped whenever the app already has 7-day data in hand.

**Alternatives considered**: Always fetching only `last-24-hours` and deriving Today/weekly data
from that alone — rejected; 24 hours of data can't produce a 7-day strip, and User Story 5
explicitly requires all 7 days regardless of the active tab.

## §5 — Wind direction on the Today card (User Story 4)

**Decision**: `aggregateBucket` (`dailyAggregation.ts`) gains a `windDirection: number | null`
field — the most recent non-null `windDirection` reading in the bucket (last-observation-wins,
the simplest reasonable choice, not a circular-mean of all readings). A new `directionToCompass`
helper in `format.ts` converts degrees to an 8-point compass abbreviation (N/NE/E/SE/S/SW/W/NW)
for display, e.g. "6 m/s SW."

**Rationale**: The mockup explicitly shows a compass abbreviation next to the Today card's wind
reading. Reusing "most recent reading" avoids introducing circular-mean averaging (genuinely more
complex for angular data, and not needed at daily-summary granularity where the general direction
is all that's useful).

**Alternatives considered**: A full circular mean of every reading's direction, weighted or
unweighted — rejected as unnecessary complexity for a single-card, at-a-glance summary value.

## §6 — Footer data-source and freshness text (User Story 6)

**Decision**: `useObservationData` also gains a `lastUpdated: string | null` return value — an ISO
timestamp set the moment the primary `series` fetch resolves. `Footer` receives both this and the
existing `series` (already available in `App.tsx`) to render
`dataSourceNote(series)`-derived text (reworded to the mockup's "SMHI observations · Open-Meteo
forecast" style, reusing the same `primarySource`/`forecastFromFallbackSource` fields
`dataSourceNote` already reads) plus "Updated HH:MM" from `lastUpdated`. Both are omitted when no
location is selected (`series` is `null`), per FR-013's "omit them otherwise."

**Rationale**: `lastUpdated` is a one-line addition to a hook the app already has, avoiding a new
data-fetching concern just to know "when was this last fetched" — the hook is exactly where that
timestamp naturally belongs.

**Alternatives considered**: Computing "last updated" from the most recent observation's own
timestamp instead of a fetch-completion clock — rejected; a forecast-heavy series' most recent
observation could be hours in the future, which would show a nonsensical "Updated" time in the
past or future rather than reflecting when data was actually retrieved.
