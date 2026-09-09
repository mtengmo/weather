# Feature Specification: Interpolate Isolated Single-Hour Gaps

**Feature Branch**: `058-interpolate-isolated-single`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "if missing data, what should be done? interpolate? it's missing today in Uppsala, observation at 13." — plus two related diagnostic questions (delayed-observation backfill, and multi-source forecast degradation), both answered directly as already-correct existing behavior, not part of this feature's scope. See Context.

Context: Three related questions were raised; two describe behavior the app already handles correctly, and one identifies a genuine, narrow gap:
1. **Delayed observations** (a station running >1h behind): already handled — `fillTrailingObservationGap` backfills every trailing null hour with that hour's own forecast value, for as long as the station stays behind, no fixed cutoff. Not part of this feature.
2. **A missing forecast hour possibly meaning a source is down**: already handled gracefully — the three forecast sources (SMHI, MET Norway, Open-Meteo) are each fetched independently (`Promise.allSettled`); one failing doesn't block the others from combining. A single missing hour reflects a gap in that hour's own source data, not a source outage. Not part of this feature.
3. **An isolated single-hour gap mid-series** (the reported Uppsala 13:00 case: a later hour already has a real reading, so the existing trailing-gap backfill never reaches back far enough to cover it): genuinely unhandled today — it renders as a blank "no data" point. **This is this feature's scope.**

A precedent already exists for exactly this kind of fix: the timeline's single "now boundary" column already gets a midpoint average of its immediate neighbors when it has no reading of its own, shown with a distinct "estimated" treatment. This feature generalizes that same rule to any isolated single-hour gap, not just that one column.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An isolated single-hour gap shows an estimated value (Priority: P1)

A viewer looking at the timeline/graph/details table sees an isolated hour with no reading of its own — but real readings immediately before and after it — filled with an estimated value (the midpoint of its two neighbors), clearly marked as estimated rather than shown as a blank gap.

**Why this priority**: This is the entire request — a single missing hour surrounded by real data is the case interpolation is exactly meant for.

**Independent Test**: Mock a series with a real reading at hour N, no reading at hour N+1, and a real reading at hour N+2; confirm hour N+1 shows the average of N and N+2, marked as estimated.

**Acceptance Scenarios**:

1. **Given** a single missing hour with real readings immediately before and after it, **When** the viewer looks at that hour, **Then** it shows an estimated value (the midpoint of its two neighbors), visually marked as estimated — the same treatment already used for the existing "now boundary" case.
2. **Given** two or more consecutive missing hours, **When** the viewer looks at them, **Then** they remain a blank gap, unchanged from today — only a single isolated missing hour gets estimated, not a run of them.
3. **Given** a missing hour at the very start or end of the available series (no neighbor on one side), **When** the viewer looks at it, **Then** it remains a blank gap, unchanged from today.
4. **Given** the existing "now boundary" column with no reading of its own, **When** the viewer looks at it, **Then** it continues to show its estimated value exactly as before — this feature generalizes that rule, not replaces it.

---

### Edge Cases

- What happens to a missing hour that's actually a forecast column (not yet observed)? Unaffected — forecast columns already have their own forecast-derived value; this feature only ever fills a gap in already-elapsed (observed) data.
- Which metrics does this apply to? All of the timeline's existing per-hour rows that can already show a gap (temperature, precipitation, wind, snow) — the same rows the existing now-boundary interpolation already covers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: An observed hour with no reading of its own, but a real reading in the immediately preceding AND immediately following hour, MUST show the midpoint average of those two neighbors.
- **FR-002**: An estimated hour (from FR-001) MUST be visually distinguishable from a genuine reading, using the same treatment already applied to the existing "now boundary" estimated column.
- **FR-003**: A run of two or more consecutive missing hours MUST remain a blank gap — this feature only ever fills a single isolated missing hour.
- **FR-004**: A missing hour with no neighbor on one side (start/end of the available series) MUST remain a blank gap.
- **FR-005**: A forecast (not-yet-observed) hour MUST be unaffected — this only applies to already-elapsed, observed hours.
- **FR-006**: The existing "now boundary" interpolation behavior MUST be preserved exactly as it is today (this feature generalizes its rule, not replaces its outcome).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of isolated single-hour observed gaps (real data immediately before and after) show an estimated value instead of a blank gap.
- **SC-002**: 0 runs of 2+ consecutive missing hours get filled — they remain blank gaps.
- **SC-003**: 0 regressions to the existing "now boundary" estimated-value behavior.

## Assumptions

- "Interpolate" means the same simple two-neighbor midpoint average already used for the now-boundary case — not a more sophisticated curve-fit or time-weighted interpolation. Consistent with existing precedent and proportionate to a single missing hour.
- This applies uniformly to every row the existing now-boundary interpolation already touches (temperature, precipitation, wind, snow) — no metric-specific exclusion, matching that existing precedent.
- The two other questions raised (delayed-observation backfill, multi-source degradation) describe already-correct existing behavior and are explicitly out of scope for this feature.
