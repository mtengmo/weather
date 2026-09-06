# Feature Specification: Calendar-Day Rain Total on the Today Card

**Feature Branch**: `033-todays-rain-total`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "on the 1. topic about 0.5mm, it should only reflect rest of the
day until midnight. strange if it starts tomorrow. start from todays midnight, end at midnight
today." — a follow-up to a prior question about the Today card's "Rain X mm" figure, which
currently totals precipitation across a rolling next-24-hours window and can therefore include
part of tomorrow.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The rain total means "today," not "the next 24 hours" (Priority: P1)

A user reading the Today card's rain figure expects it to describe today — the calendar day they
are currently in — not an arbitrary 24-hour window that can spill into tomorrow depending on what
time it currently is.

**Why this priority**: This is the entire feature — correcting a specific, confusing figure the
user directly flagged as counting rain from tomorrow under today's label.

**Independent Test**: At any time of day, the rain figure equals the sum of precipitation from
local midnight at the start of today through local midnight at the end of today — never
including any amount from tomorrow, and never omitting an amount already fallen earlier today.

**Acceptance Scenarios**:

1. **Given** it is currently mid-afternoon, **When** the user reads the rain figure, **Then** it
   reflects the total for the full calendar day (already-elapsed hours plus the remaining
   forecast hours), not just the hours still ahead.
2. **Given** rain is forecast for tomorrow but none is expected for the remainder of today,
   **When** the user reads today's rain figure, **Then** it does not include tomorrow's forecast
   amount.
3. **Given** it is currently late at night (close to midnight), **When** the user reads the rain
   figure, **Then** it still reflects only today's calendar-day total — not tomorrow's, even
   though a rolling next-24-hours window would mostly cover tomorrow at that time.
4. **Given** no precipitation has fallen or is forecast for any part of today, **When** the user
   reads the rain figure, **Then** it reads as no rain, exactly as it does today for an
   equivalent case.

---

### Edge Cases

- What happens right after midnight, when almost none of today has elapsed yet and almost all of
  today's own hours are still in the forecast? The total simply reflects whatever is forecast for
  the remaining ~24 hours of the new calendar day — normal behavior, not a special case.
- What happens if the underlying data doesn't reach all the way to the end of today (e.g. a
  forecast source with limited reach)? The total reflects whichever part of today's calendar day
  actually has data available — it does not fabricate a value for hours with no data, consistent
  with how every other figure on this card already handles missing data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Today card's rain total MUST be calculated over the current calendar day only —
  from local midnight at the start of today through local midnight at the end of today — not a
  rolling 24-hour window measured from the current moment.
- **FR-002**: The rain total MUST include precipitation from hours of today that have already
  elapsed (already observed) as well as hours of today still ahead (forecast), combined into one
  figure.
- **FR-003**: The rain total MUST NOT include any precipitation amount attributed to tomorrow or
  any later day, regardless of what time it currently is.
- **FR-004**: This change applies only to the rain total — the Today card's other figures (high/
  low, description/icon, wind, sunrise/sunset) are unaffected by this feature.

### Key Entities

*(No new data entities — this changes which existing precipitation readings are summed for one
already-displayed figure.)*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At any time of day, the displayed rain total matches the sum of precipitation for
  the current calendar day alone, verifiable independent of implementation.
- **SC-002**: The displayed rain total never changes as a side effect of tomorrow's forecast
  changing, only as a result of today's own data changing.

## Assumptions

- **"Today" means the local calendar day**: Midnight-to-midnight in the user's own device
  timezone — the same locally-anchored convention this app already uses elsewhere (e.g. the
  day/night cutoff for clear-sky icons, and the 3-day view's own local-midnight day boundaries).
- **Scope is the Today card's rain figure only**: The user's feedback named this one value
  specifically; the Today card's high/low, condition icon/description, and every other view's own
  rolling-window figures (the 24-hour/3-day/7-day charts, the 7-day forecast strip) are
  intentionally left unchanged by this feature.
