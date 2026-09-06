# Feature Specification: Fix Today Summary's Backward-Looking Condition

**Feature Branch**: `023-fix-today-summary`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "It seems it says cloudy today on the brief summart, but the 24h forecast today is sunny? see picture" — screenshot shows the persistent "Today" card reading "Cloudy" (High 18°/Low 9°) while the 24-hour hourly timeline directly below it shows Clear (sun/moon) icons for every visible hour from early morning through the evening, with only the last couple of hours a rolling window would reach showing cloud.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Today card matches what "today" actually looks like (Priority: P1)

A user glancing at the persistent "Today" summary expects its condition (and description, high/low) to reflect the day they're currently looking at — matching what the hourly forecast right below it shows — not a different, confusing reading.

**Why this priority**: A real, user-visible inconsistency between two pieces of the same screen describing "today" — directly undermines trust in the dashboard's basic correctness, the same class of issue previous rounds have prioritized as P1.

**Independent Test**: Load the dashboard for a location where the recent past 24 hours and the upcoming 24 hours have different dominant conditions (e.g. a cloudy previous evening followed by a clear day); confirm the persistent Today card's condition matches the currently-relevant, forward-looking conditions the hourly view shows, not a stale reading dominated by hours that have already passed.

**Acceptance Scenarios**:

1. **Given** the most recent 24 hours (ending now) were mostly cloudy but the current hour and the rest of today are clear, **When** the Today card is shown, **Then** its condition reflects the current/upcoming clear conditions, not the already-past cloudy hours.
2. **Given** the Today card and the 24-hour hourly view are both visible at once, **When** a user compares them, **Then** they describe the same day consistently — a user should never see "Cloudy" on one and all-clear icons on the other for the same stretch of time.
3. **Given** a location with no forecast data at all (observations only), **When** the Today card is shown, **Then** it falls back to summarizing the most recent available observed conditions, exactly as it does today — this fallback behavior is unaffected.

### Edge Cases

- What happens right at midnight, when "yesterday" and "today" are momentarily ambiguous? The card continues to reflect the day going forward from the current moment, not a boundary-sensitive recalculation tied to the exact clock second.
- What happens when there's no forecast data reaching into the rest of today (e.g. a source outage)? The card degrades to the best available data (most recent observed conditions) rather than showing no summary at all, matching today's existing no-forecast fallback.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The persistent Today summary's condition, description, high, and low MUST be derived from conditions covering the current moment forward through the rest of the day, not primarily from hours that have already elapsed.
- **FR-002**: The Today summary MUST remain visually and logically consistent with the hourly 24-hour view shown alongside it — a user MUST NOT see the two describing materially different conditions for overlapping hours.
- **FR-003**: When no forward-looking (forecast) data is available at all for a location, the Today summary MUST fall back to summarizing the most recent available observed conditions, matching existing behavior for forecast-unavailable locations.
- **FR-004**: This change MUST NOT alter the 7-day forecast strip's own per-day cards for days other than today, nor fabricate data beyond what a source genuinely provides.

### Key Entities

- **Today Summary**: The persistent "Today" card's condition/description/high/low — re-scoped to represent the day going forward from now, rather than a trailing window ending now.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a location whose recent past and upcoming conditions genuinely differ, the Today card's stated condition matches the dominant condition shown across the visible hourly forecast, verified by direct comparison.
- **SC-002**: Zero user-visible contradictions between the Today card and the hourly 24-hour view for the same day, verified across a range of real locations and weather patterns.

## Assumptions

- "Today" is understood as "from now through the rest of the current day," matching how a user reads a persistent summary card labeled "Today" alongside sunrise/sunset times for the current date — not a trailing 24-hour statistical window, which is the confirmed root cause of the reported mismatch (the card was reading the most recent *past* 24 hours ending now, which can be dominated by weather that has already passed, such as a cloudy previous evening, even when the rest of today is clear).
- Locations with no forecast data at all keep today's existing fallback (most recent observed conditions) — this spec only changes which window is used when forward-looking data genuinely exists.
