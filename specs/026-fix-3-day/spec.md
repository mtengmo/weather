# Feature Specification: Fix 3-Day "Observed" Mislabel & Add Weekday Labels

**Feature Branch**: `026-fix-3-day`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "also, the 3d view, doesn't show observation, but the title says observation. Something wrong on it. Could add over the morning/lunch/evening view the weekday so it make sense which day it is"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The section label matches what's actually shown (Priority: P1)

A user viewing the 3-day timeline sees a section header reading "Observed" spanning the entire
visible width, even when every visible period is actually a forecast — the label contradicts
what's on screen.

**Why this priority**: A genuine, visible correctness defect — a label that actively
misrepresents the data as observed when it's forecast undermines trust in the whole dashboard.

**Independent Test**: View the 3-day timeline for a location/moment where the visible window is
entirely forecast (no observed periods at all); confirm the section header reads "Forecast," not
"Observed."

**Acceptance Scenarios**:

1. **Given** the 3-day timeline's visible periods are entirely forecast (no observed periods at
   all in the window), **When** the section header is shown, **Then** it reads "Forecast"
   spanning the full width, not "Observed."
2. **Given** the 3-day timeline's visible periods are entirely observed (no forecast periods at
   all), **When** the section header is shown, **Then** it reads "Observed" spanning the full
   width, unchanged from today.
3. **Given** the 3-day timeline's visible periods are a mix of observed and forecast, **When** the
   section header is shown, **Then** it splits into "Observed" and "Forecast" sections
   proportional to each, exactly as it already does today.

---

### User Story 2 - The weekday is visible above the sub-day periods (Priority: P2)

A user viewing the 3-day timeline's Morning/Lunch/Afternoon/Evening/Night columns wants to know
which calendar day each group of columns belongs to, without having to count or infer it.

**Why this priority**: A usability improvement that makes an already-shipped view easier to read
— independent of the Priority 1 correctness fix above.

**Independent Test**: View the 3-day timeline; confirm each day's group of sub-day period columns
(Morning through Night) is labeled with that day's weekday, distinguishing it from the other two
days shown.

**Acceptance Scenarios**:

1. **Given** the 3-day timeline is shown, **When** a user looks at any group of sub-day period
   columns, **Then** the weekday that group belongs to is visibly labeled above or alongside it.
2. **Given** two adjacent days in the 3-day timeline, **When** a user compares their weekday
   labels, **Then** the labels are visibly distinct and correctly correspond to each day's actual
   calendar date.
3. **Given** the existing day-boundary marker between days, **When** the weekday label is added,
   **Then** the two coexist without conflicting or duplicating information confusingly.

### Edge Cases

- What happens at the exact moment a day rolls over from forecast to observed (or vice versa)
  mid-view? The section header split point continues to reflect the true boundary, recalculated
  the same way it already is today — only the "all-forecast" and "all-observed" edge cases
  (previously both silently treated as "all-observed") are corrected.
- What happens on the 7-day (non-sub-day) view, where day labels already include the weekday? It
  is unaffected — the weekday-label addition is specifically for the 3-day sub-day view, which
  currently shows only period names (Morning, Lunch, etc.) with no date context at all.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST label the 3-day timeline's section header "Forecast" (not
  "Observed") when every visible period is forecast.
- **FR-002**: The system MUST continue to label the section header "Observed" when every visible
  period is observed, unchanged from today.
- **FR-003**: The system MUST continue to split the section header proportionally into "Observed"
  and "Forecast" when the visible window contains both, unchanged from today.
- **FR-004**: The 3-day timeline MUST display each day's weekday above or alongside that day's
  group of sub-day period columns (Morning, Lunch, Afternoon, Evening, Night).
- **FR-005**: The weekday label MUST correctly correspond to each column's actual calendar date,
  never a fabricated or guessed date.

### Key Entities

- **Timeline Section Header**: The "Observed"/"Forecast" label spanning the 3-day timeline's
  visible columns, corrected to reflect all three possible states (all-observed,
  all-forecast, mixed) rather than only two.
- **Sub-Day Period Group**: The set of Morning/Lunch/Afternoon/Evening/Night columns belonging to
  one calendar day within the 3-day view, now labeled with that day's weekday.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Viewing the 3-day timeline when its visible window is entirely forecast shows
  "Forecast," never "Observed," verified directly against a real location/moment where this
  occurs.
- **SC-002**: A user can identify which weekday any group of Morning-through-Night columns in the
  3-day view belongs to without counting columns or doing date arithmetic themselves.

## Assumptions

- Root cause for User Story 1 was confirmed via code review and live verification before writing
  this spec: the section-header logic finds the boundary between observed and forecast periods,
  but when there are zero observed periods at all (the boundary search finds forecast starting at
  the very first column), it returns the same "no boundary" result as when there are zero forecast
  periods — both cases were rendered identically as "Observed, full width," which is only correct
  for one of them.
- The weekday label (User Story 2) is placed so it doesn't require removing or renaming the
  existing period-name labels (Morning, Lunch, etc.) — both remain visible, distinguishing "which
  part of the day" (period name) from "which day" (weekday), which today only the period name
  answers.
