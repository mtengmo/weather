# Feature Specification: Declutter Timeline Header and Move Moon Phase to the Today Card

**Feature Branch**: `041-move-moon-to-today-card`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description:
"Data: SMHI

Sunrise: 06:00
Sunset: 19:33
Moon: waning crescent
Remove this, except moon, maybe that could be added the above daily summary?"

Read as: on the dashboard Overview, right above the hourly/daily timeline, there is a row showing the data source ("Data: SMHI") followed by Sunrise, Sunset, and Moon phase. The user wants the data-source line and the Sunrise/Sunset line removed from there, but the Moon phase kept — moved up into the "Today" summary card instead (which already shows its own Sunrise/Sunset, making the timeline's copy redundant).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A less cluttered timeline header (Priority: P1)

A dashboard viewer looks at the Overview page and sees a row directly above the timeline repeating information (data source, sunrise, sunset) that's either not useful there or already shown elsewhere (the Today card already shows sunrise/sunset). They want that row gone so the timeline starts sooner and reads cleaner.

**Why this priority**: The core decluttering request — named first, and it's what makes the page feel simpler.

**Independent Test**: Open the Overview page and confirm no "Data: SMHI"-style note or Sunrise/Sunset line appears directly above the timeline.

**Acceptance Scenarios**:

1. **Given** the Overview page is open, **When** the viewer looks at the area directly above the timeline, **Then** no data-source note (e.g. "Data: SMHI") is shown there.
2. **Given** the Overview page is open, **When** the viewer looks at the area directly above the timeline, **Then** no Sunrise/Sunset line is shown there.
3. **Given** the data-source information is still meaningful to a viewer, **When** they check the app's footer, **Then** the existing footer data-source/freshness disclosure is still present, unaffected by this change — the information isn't lost, just no longer duplicated above the timeline.

---

### User Story 2 - See the moon phase as part of Today's summary (Priority: P2)

A dashboard viewer wants to know tonight's moon phase alongside the rest of today's at-a-glance summary (high/low, rain, wind, sunrise/sunset), rather than in a separate line above the timeline.

**Why this priority**: The one piece of the old row the user explicitly wants kept, just relocated — secondary to the main decluttering goal.

**Independent Test**: Open the Overview page and confirm the Today card shows the current moon phase alongside its existing sunrise/sunset figures.

**Acceptance Scenarios**:

1. **Given** the Overview page is open, **When** the viewer looks at the Today card, **Then** it shows today's moon phase in addition to its existing high/low, rain, wind, and sunrise/sunset figures.
2. **Given** the moon phase can't be determined for some reason, **When** the viewer looks at the Today card, **Then** it degrades the same way other missing Today-card figures already do (a placeholder/dash), rather than breaking the card.

---

### Edge Cases

- What happens to the Sunrise/Sunset figures that used to appear above the timeline? They're not lost — the Today card already shows its own Sunrise/Sunset, which remains unaffected by this change.
- What happens on a day/location where sunrise or sunset doesn't occur (e.g. polar day/night at high latitude)? Unchanged from today's existing Today-card behavior for that case.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Overview page MUST NOT show a data-source note (e.g. "Data: SMHI") directly above the timeline.
- **FR-002**: The Overview page MUST NOT show a Sunrise/Sunset line directly above the timeline.
- **FR-003**: The app's existing footer data-source/freshness disclosure MUST remain unchanged by this feature.
- **FR-004**: The Today summary card MUST show the current moon phase alongside its existing figures.
- **FR-005**: Removing the data-source/Sunrise/Sunset line above the timeline MUST NOT affect the Details/graph view's own, separate data-source note.

### Key Entities

- **Moon phase**: A named lunar phase (e.g. "waning crescent") for a given date, already computed elsewhere in the app; this feature only changes where it's displayed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a representative set of Overview page loads, 100% show no data-source note or Sunrise/Sunset line above the timeline.
- **SC-002**: For a representative set of Overview page loads, 100% show the moon phase within the Today card.
- **SC-003**: The Details/graph view's own data-source note is unaffected in 100% of sessions.

## Assumptions

- "The above daily summary" refers to the existing "Today" summary card (high/low, description, rain, wind, sunrise/sunset), which already sits above the timeline on the Overview page — the natural, already-existing home for a per-day figure like moon phase.
- The Sunrise/Sunset figures removed from above the timeline are not being deleted from the app entirely — they already exist, unchanged, on the Today card, so no information is lost.
- The Details/graph view's own, separately-rendered "Data: SMHI"-style note (unrelated to sunrise/sunset/moon) is out of scope — the user's request describes the Overview page's specific three-line block, not every data-source note in the app.
- This feature only affects the Overview page's layout; no underlying sunrise/sunset/moon-phase calculation logic changes.
