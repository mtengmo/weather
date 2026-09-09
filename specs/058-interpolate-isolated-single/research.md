# Research: Interpolate Isolated Single-Hour Gaps

## 1. The existing "now boundary" case is a special case of the general rule, not a separate one

**Decision**: Replace `interpolateNowBoundary(row, nowBoundaryIndex)` with a general `interpolateIsolatedGaps(row)` that scans every point in the row (not just one fixed index) and fills any point where `value === null` and both its immediate neighbors have `value !== null` — with no `isForecast` check on any of the three points involved.

**Rationale**: Tracing the existing code: `nowBoundaryIndex = boundaryIndex(periods.map(p => p.isForecast))`, and the point actually filled is `row.points[nowBoundaryIndex + 1]` — the *first forecast-flagged* point, not an observed one. So the existing "now boundary" gap is itself a forecast-flagged point with no value of its own (the forecast data didn't cover that exact hour yet) — the same shape of problem as an isolated observed gap, just at a different position and with a different `isForecast` value on the gap point itself. A genuine, normally-forecasted hour always has a real `value` (forecast data populates every hour it covers), so it's never touched by a value-based scan regardless of its `isForecast` flag — the spec's FR-005 ("a forecast hour must be unaffected") holds for every *normal* forecast hour automatically, without needing an explicit `isForecast` gate that would otherwise have excluded the now-boundary case (FR-006) it must keep.

**Alternatives considered**: Keep `interpolateNowBoundary` untouched and add a *second*, separate function for other isolated gaps — rejected: two functions implementing the identical midpoint-average rule, differing only in which indices they scan, is needless duplication once it's clear they're the same rule.

## 2. Which rows

**Decision**: All four rows the existing function already touches — temperature, precipitation, wind, snow — via the same call sites in `buildHourlyTimelineData`/`build3DayTimelineData` (wherever `interpolateNowBoundary` is currently called).

**Rationale**: Matches spec's Assumptions; no reason to treat one metric differently from how the shipped now-boundary case already treats it.

## 3. Scan bounds and "isolated" definition

**Decision**: For each index `i` from `1` to `points.length - 2` (never the first or last point, which have no neighbor on one side — FR-004): if `points[i].value === null && points[i-1].value !== null && points[i+1].value !== null`, set `points[i] = { ...points[i], value: (points[i-1].value + points[i+1].value) / 2, interpolated: true }`.

**Rationale**: A run of 2+ consecutive nulls fails this check for every point in the run (each one's neighbor is also null), so FR-003 (runs of 2+ stay blank) holds automatically with no extra logic needed.

## 4. Wind row's extra fields (direction, gust)

**Decision**: Only `value` and `interpolated` are set on a filled point — `direction`/`gust` (wind row) and `chanceOfRain`/`high`/`low` (other rows' optional fields) are left as whatever the null point already had (typically also `null`), unchanged from the existing now-boundary behavior.

**Rationale**: Matches existing precedent exactly; inventing a direction/gust interpolation is out of scope and not requested.

## 5. Call sites

**Decision**: Only `buildHourlyTimelineData` calls `interpolateNowBoundary` today (confirmed — `build3DayTimelineData`/`buildDailyTimelineData` never did, since a single missing hour has no equivalent "gap" concept once aggregated into a whole day's average). Replace its four calls with `interpolateIsolatedGaps(rows.X)` (drop the `nowBoundaryIndex` argument — no longer needed by the row-filling logic itself; `nowBoundaryIndex` is still computed/returned separately for the "Now" marker's own positioning, unrelated to this change).

**Rationale**: Matches the feature's natural scope (the hourly view, where the user's own Uppsala 13:00 example lives) without inventing a new concept for the daily/3-day views, which don't need one.
