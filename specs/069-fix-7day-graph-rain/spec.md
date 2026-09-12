# Feature Specification: Fix the Same Brief-Rain Bug on the 7-Day Forecast Graph

**Feature Branch**: `069-fix-7day-graph-rain`

**Created**: 2026-09-12

**Status**: Draft

**Input**: User description: "the fix you did for the dialy brief summary, it's working, but the same problem occours on the 7d forecast graph"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The 7-day overview's daily icons stop overstating brief rain, like the daily brief already does (Priority: P1)

A user switches the weather overview to its 7-day view. A day whose only rain is confined to a
couple of morning hours still shows a rain icon/condition for the entire day's column, even though
the persistent daily-brief strip elsewhere on the same screen (already fixed) correctly shows that
same day as dry. The 7-day view is a second, independent place in the app showing a whole-day
weather icon, and it was never updated when the daily brief was fixed.

**Why this priority**: The only story in this feature — closing the same accuracy gap
(066-daily-forecast-language-setting, 067-fix-rain-brief-icons) in a second location that was
missed the first time, reported directly by the user as an inconsistency between two parts of the
same screen.

**Independent Test**: Can be fully tested by constructing a 7-day-window day with rain confined to
a couple of morning hours and dry the rest of the daytime span, switching the overview to its
7-day view, and confirming that day's icon/condition now shows dry — matching what the daily brief
strip already shows for the identical data.

**Acceptance Scenarios**:

1. **Given** a forecast day (in the 7-day overview) with rain confined to a couple of morning
   hours and the rest of the daytime hours (6 AM-8 PM) dry, **When** the 7-day overview renders
   that day's column, **Then** it shows a dry condition/icon, matching the already-fixed daily
   brief strip for the same underlying data.
2. **Given** a forecast day (in the 7-day overview) with rain spanning most of the daytime hours,
   **When** the 7-day overview renders that day's column, **Then** it still shows rain.
3. **Given** a forecast day (in the 7-day overview) with a brief but heavy rain event confined to
   part of the daytime hours, **When** the 7-day overview renders that day's column, **Then** it
   still shows rain — a genuinely significant rain event is never hidden.
4. **Given** a forecast day whose only rain is entirely overnight (before 6 AM or after 8 PM),
   **When** the 7-day overview renders that day's column, **Then** it shows dry, exactly as the
   already-fixed 066 behavior requires.
5. **Given** the 3-day overview (which already breaks each day into morning/lunch/afternoon/
   evening/night periods rather than one whole-day column), **When** it renders any day, **Then**
   its behavior is completely unchanged by this fix — it was never affected by this bug in the
   first place and must not be altered.
6. **Given** the daily brief strip and the 7-day overview are both showing the same day's data at
   the same time, **When** the user compares them, **Then** they agree on whether that day shows
   rain or not.

---

### Edge Cases

- A day with no precipitation at any hour is unaffected by this fix — its condition/icon in the
  7-day overview stays exactly as it is today.
- A day with too little forecast data to compute any daytime-hour breakdown falls back to today's
  existing whole-day behavior for that day, matching the same fallback rule already established
  for the daily brief strip — a day never ends up with no computable condition.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The 7-day overview's daily condition/icon MUST be derived using the same
  daytime-hour-weighted rule already applied to the daily brief strip (066-daily-forecast-
  language-setting's daytime-vs-overnight distinction, and 067-fix-rain-brief-icons' majority-of-
  daytime-hours-or-heavy-single-hour rule) — not the whole-bucket, un-weighted total this view
  currently still uses.
- **FR-002**: This fix MUST apply only to the 7-day overview's whole-day columns; it MUST NOT
  change the 3-day overview's sub-day-period columns (morning/lunch/afternoon/evening/night),
  which already isolate a narrow enough time range that this bug doesn't apply to them.
- **FR-003**: This fix MUST NOT change the daily brief strip's own behavior, the hourly (24-hour)
  timeline's behavior, or the Today card's behavior — all already either correct or out of scope.
- **FR-004**: After this fix, the daily brief strip and the 7-day overview MUST agree on whether
  any given day shows rain, for the same underlying forecast data.

### Key Entities

- **7-day overview daily condition**: The single weather condition/icon shown per day in the
  weather overview's 7-day display mode — previously derived from the whole rolling-24-hour
  bucket's totals, now refined to use the same daytime-hour-weighted signal the daily brief strip
  already uses.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A day with rain confined to a couple of morning hours and dry the rest of the day is
  shown as dry in the 7-day overview 100% of the time.
- **SC-002**: A day with rain spanning most of the daytime hours, or a brief but heavy rain event,
  is still shown as rain in the 7-day overview 100% of the time.
- **SC-003**: For any given day's data, the daily brief strip and the 7-day overview show the same
  rain/dry condition 100% of the time.
- **SC-004**: The 3-day overview's rendered output is unchanged before and after this fix, for
  identical input data.

## Assumptions

- "7d forecast graph" refers to the weather overview's 7-day display mode (the tab/window showing
  one column per day, distinct from the always-visible daily brief strip and from the 3-day
  sub-day-period view) — confirmed by inspecting the codebase: this is the only other place in the
  app deriving a single whole-day rain condition from the same un-weighted fields the daily brief
  strip used before it was fixed.
- The fix reuses the exact daytime-weighting logic already established (066/067) rather than
  introducing a new or different rule — the goal is consistency between the two views, not a new
  policy.
