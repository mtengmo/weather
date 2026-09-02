# Feature Specification: Chance of Rain Alongside Precipitation Amount

**Feature Branch**: `011-precipitation-chance`

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: "chance for rain i % under the mm."

## Clarifications

### Session 2026-09-02

- Q: How should the 7-day view's daily column derive a single chance-of-rain percentage from that day's 24 hourly probability readings? → A: Use the maximum hourly probability within that day's bucket

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See how likely rain is, not just how much (Priority: P1)

A user checking the timeline's precipitation row today sees only a millimeter amount per column (e.g. "2.0 mm"). A millimeter figure alone doesn't tell them how confident that forecast is — a small amount with high confidence and a small amount that might not happen at all currently look identical. The precipitation row is extended so that, wherever a chance-of-rain percentage is available for a column, it's shown underneath that column's millimeter amount, letting the user judge both how much rain is expected and how likely it is.

**Why this priority**: Directly requested; the single most useful addition to the existing precipitation row, and self-contained.

**Independent Test**: Open the timeline for a location/window where forecast precipitation-probability data is available; confirm each forecast column in the precipitation row shows a percentage beneath its millimeter value, and that a column without probability data (e.g. an observed/historical hour, or a forecast source that doesn't supply it) shows only the millimeter value as it does today.

**Acceptance Scenarios**:

1. **Given** a forecast timeline column with both a precipitation amount and a chance-of-rain percentage available, **When** the precipitation row renders that column, **Then** it shows the millimeter amount with the percentage displayed beneath it.
2. **Given** an observed (historical, already-measured) timeline column, **When** the precipitation row renders that column, **Then** it shows only the millimeter amount, with no percentage (observed hours are measured, not probabilistic).
3. **Given** a forecast timeline column where a percentage isn't available from the underlying data source, **When** the precipitation row renders that column, **Then** it shows only the millimeter amount, matching today's behavior, with no blank placeholder for the missing percentage.
4. **Given** the whole displayed series has no chance-of-rain data available anywhere (e.g. the current forecast source doesn't supply it at all), **When** the precipitation row renders, **Then** it behaves exactly as it does today (amounts only), with no empty percentage placeholders anywhere in the row.
5. **Given** a 7-day view's forecast day where the underlying hourly data has a mix of chance-of-rain values across that day (e.g. 10% overnight, 70% in the afternoon), **When** that day's column renders, **Then** it shows the day's maximum hourly value (70%), not an average.

---

### Edge Cases

- A 0% chance-of-rain value is a real, meaningful reading (not "no data") and must be displayed as "0%", distinct from a column where no probability was supplied at all.
- The percentage must not be confused with, or overlap visually with, the millimeter amount — it reads clearly as a secondary, smaller value under the primary amount.
- If a data source used for part of the displayed series supplies probability and another part of the same series (e.g. after a fallback-provider switch) doesn't, the row shows the percentage only for the columns that have it, without implying a false 0% or blank state for the columns that don't.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The timeline's precipitation row MUST display a chance-of-rain percentage beneath the millimeter amount for any column where that percentage is available from the underlying weather data.
- **FR-002**: The timeline's precipitation row MUST continue to show only the millimeter amount, unchanged from today, for any column where a chance-of-rain percentage is not available.
- **FR-003**: A chance-of-rain value of 0% MUST be displayed as "0%", distinguishable from a column that has no percentage data at all (which shows no percentage).
- **FR-004**: Observed (already-measured) columns MUST NOT display a chance-of-rain percentage, since a measured amount is not a probability.
- **FR-005**: The chance-of-rain percentage MUST be visually secondary to (e.g. smaller than) the millimeter amount it accompanies, so the row's primary reading (how much rain) is not displaced by the new secondary reading (how likely).
- **FR-006**: The 7-day view's daily precipitation column MUST derive its chance-of-rain percentage as the maximum hourly probability among that day's underlying hourly readings, not an average — consistent with how this app already derives other daily "peak" figures (e.g. daily wind gust) from their bucket's maximum.

### Key Entities

- **Chance of Rain**: An optional percentage (0-100) associated with a forecast timeline point, representing the likelihood of precipitation at that point, sourced from whichever forecast provider supplied that point's data when available. For a 7-day view's daily column, this is the maximum of that day's underlying hourly percentages rather than a single reading.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a forecast window where the active data source supplies precipitation probability, 100% of forecast columns in the precipitation row show both the amount and the percentage.
- **SC-002**: For any window/source that doesn't supply precipitation probability, the precipitation row's appearance is unchanged from before this feature (amounts only), with zero empty percentage placeholders.
- **SC-003**: A user glancing at the precipitation row can tell, without additional explanation, that the smaller number under each amount represents a likelihood rather than a second amount, in a usability spot-check.

## Assumptions

- "Chance for rain" is interpreted as the general precipitation-probability figure already common in forecast APIs (covering rain, snow, or mixed precipitation alike for that hour/day), not narrowly limited to liquid rain versus snow — the existing precipitation row already covers all precipitation types together, and this feature follows that same scope.
- This percentage is inherently a forecast-only concept and is expected to be available only for some columns depending on which upstream provider supplied that column's forecast data (some providers expose it, some don't) — the feature is scoped to display it opportunistically wherever available, not to guarantee it appears for every forecast hour/day.
- No new upstream API calls beyond what a provider already returns are assumed necessary; if a provider already includes a probability field in the response the app already fetches, this feature reads and displays it — it does not require switching or adding weather-data providers.
- This feature applies to both the 24-hour and 7-day timeline views, following the same per-column pattern, since the underlying precipitation row already exists in both.
