# Feature Specification: Fix Night Moon Icon Appearing on Whole-Day Columns

**Feature Branch**: `056-fix-night-moon`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "the 7d screenshot also show it, feels little strange as it's daytime."

Context: Regression from `054-night-time-moon`. That feature added a night-icon lookup driven by the *current clock hour* at the moment the page loads, applied uniformly everywhere `resolveConditionIconFromCondition` is called — including the 7-day view's whole-day columns. Those columns deliberately never associate with a specific time of day (a whole day inherently spans both day and night, so their condition is always derived without a timestamp, and is always `"clear-day"`, never `"clear-night"` — an existing, intentional rule from `007`/`008`, cited directly in `timelineData.ts`). 054's fix ignored that distinction: it showed the moon variant for a whole-day column whenever the *page happened to be loaded* at night, regardless of that day's actual weather — exactly what the user is reporting on the 7-day view during actual daytime (the column's night-icon presence has nothing to do with that day being cloudy or clear; it's an artifact of when the page was opened).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Whole-day columns never show a night icon (Priority: P1)

A viewer looking at the 7-day (or 3-day) view's whole-day columns never sees a moon-based icon there, regardless of what time of day they happen to be looking at the app.

**Why this priority**: This is the reported regression — a whole-day summary showing a moon is nonsensical and confusing, undermining the very feature (054) meant to make icons more accurate.

**Independent Test**: Render the 7-day view with a clear whole-day column while the system clock is set to nighttime; confirm the day (sun) icon renders, not the night (moon) one.

**Acceptance Scenarios**:

1. **Given** a clear whole-day column on the 7-day view, **When** the viewer looks at it regardless of the current time of day, **Then** it shows the day (sun) icon, never the night (moon) one.
2. **Given** an hourly column (24-hour view) at an actual nighttime hour with a clear SMHI code, **When** the viewer looks at it, **Then** it still correctly shows the night (moon) icon — 054's original fix for genuine hourly periods is unaffected.
3. **Given** an hourly column with no SMHI code but a genuinely clear nighttime reading (the fallback path, e.g. a MET Norway/Open-Meteo location), **When** the viewer looks at it, **Then** it still correctly shows the night (moon) icon.

---

### Edge Cases

- What happens on the 3-day view's sub-day columns (morning/lunch/afternoon/evening/night)? Unchanged from before 054 — these already never carried a timestamp into condition derivation either (the same "no timestamp" rule applies uniformly to every aggregate/whole-bucket period, not just 7-day columns), so they were never affected by 054's bug and aren't affected by this fix.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A whole-day (aggregate) column MUST NOT show a night-variant icon under any circumstance, regardless of the current clock time.
- **FR-002**: An hourly period with a genuine SMHI symbol code MUST continue to correctly show a night-variant icon at nighttime hours (054's original behavior for this case, unaffected).
- **FR-003**: An hourly period on the no-SMHI-code fallback path MUST continue to correctly show a night-variant icon when its own derived condition is genuinely nighttime (`clear-night`), unaffected.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 whole-day columns show a night-variant icon, at any time of day.
- **SC-002**: 100% of genuinely nighttime hourly periods (both the SMHI-code and fallback paths) continue to show the correct night-variant icon, unchanged from 054.

## Assumptions

- The fix is a correction to *which signal* determines "is this period at night" — using the period's own already-correct derived condition (`clear-night` only ever appears for a genuine point-in-time reading) instead of a separately-computed clock-hour check — not a new day/night rule.
