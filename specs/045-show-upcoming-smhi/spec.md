# Feature Specification: Show Upcoming Weather Warnings

**Feature Branch**: `045-show-upcoming-smhi`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "the smhi app says 'skyfall rain' warning for tomorrow, but I can't see that warning in my app? will it arrive tomorrow?" — follow-up scoping: yes, show upcoming (not-yet-active) warnings with a "starts in X" indicator, not just currently-active ones.

Context: `028-severe-weather-warnings` shipped a banner that shows only *currently active* official SMHI warnings for the viewed location (`getWarningsForLocation` in `weatherApi.ts` filters out anything whose start time is still in the future). The user noticed SMHI's own app already showed a warning for tomorrow (a "skyfall"/cloudburst warning) that this app hid until it actually goes active. This feature extends the banner to also surface warnings that are published but not yet active, so the user isn't left wondering whether a warning they've seen elsewhere is "missing" or just not due yet.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a warning that starts soon, before it goes active (Priority: P1)

A viewer checking the dashboard sees that an official warning has been published for their location and will begin within the near future, even though it isn't in effect yet, so they know to expect it rather than being surprised when it starts.

**Why this priority**: This is the entire request — the user was confused seeing a warning in SMHI's own app that this app didn't show at all, since it was hidden until active.

**Independent Test**: Publish (or simulate) a warning whose `approximateStart` is a few hours in the future for the viewed location; confirm it appears in the warning banner with a clear "not yet active" / "starts in X" indication, distinct from an already-active warning.

**Acceptance Scenarios**:

1. **Given** a published warning for the viewed location whose start time is later today or tomorrow, **When** the viewer looks at the dashboard, **Then** the warning appears in the banner labeled with when it starts (e.g. "starts in 14 hours" or the local start time), rather than being hidden.
2. **Given** that same warning, **When** its start time passes, **Then** it transitions to being shown the same way an already-active warning is shown today (no "starts in" label), without the viewer needing to do anything.
3. **Given** a warning whose end time has already passed, **When** the viewer looks at the dashboard, **Then** it still does not appear (expired warnings remain excluded, unchanged from today).

---

### User Story 2 - Upcoming and active warnings are told apart at a glance (Priority: P2)

A viewer with both an active warning and an upcoming one for their location can tell which is which without reading the full description.

**Why this priority**: Once upcoming warnings are shown at all, conflating them with active ones would be misleading — a viewer might think an emergency is already underway when it's still hours away.

**Independent Test**: Simulate one active and one upcoming warning for the same location; confirm the banner visually/textually distinguishes them (e.g. active ones lead, upcoming ones are clearly marked with their start time) and that severity-based ordering still applies within each group.

**Acceptance Scenarios**:

1. **Given** one active and one upcoming warning for the location, **When** the viewer opens the banner, **Then** the active warning is presented as currently in effect and the upcoming one is presented as not yet started, with its expected start time visible.
2. **Given** multiple upcoming warnings of different severities, **When** the viewer opens the banner, **Then** they are ordered most-to-least severe among themselves, consistent with how active warnings are already ordered today.

---

### Edge Cases

- What happens to a warning that is published far in advance (e.g. several days out)? To avoid cluttering the banner with warnings too distant to be actionable, only warnings starting within a bounded near-term window are shown as "upcoming"; ones further out remain hidden until they enter that window (see Assumptions).
- What happens if an upcoming warning is withdrawn by SMHI before it ever goes active (SMHI simply stops publishing it)? It disappears from the banner on the next refresh, the same way an active warning disappears today when SMHI withdraws it — no special handling needed.
- What happens if a viewer dismisses an upcoming warning, and it later becomes active? Out of scope to decide differently from today's existing dismissal behavior — dismissal is already tracked per exact warning id, and an upcoming warning keeps the same id once it becomes active, so a dismissal made while it was upcoming continues to apply once it's active, consistent with the existing one-id-one-dismissal design.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST include, alongside currently-active warnings, any published warning for the viewed location whose start time is in the future but within a bounded near-term window (see Assumptions for the specific window).
- **FR-002**: Each upcoming warning shown MUST be clearly distinguishable from an active one, including a human-readable indication of when it starts.
- **FR-003**: Warnings whose end time has already passed MUST continue to be excluded, unchanged from current behavior.
- **FR-004**: Warnings starting further out than the near-term window MUST continue to be excluded until they enter that window.
- **FR-005**: Ordering MUST remain most-to-least severe, applied consistently whether a warning is active or upcoming.
- **FR-006**: Existing per-warning dismissal MUST continue to work unchanged for both active and upcoming warnings.
- **FR-007**: Locations outside SMHI coverage, or a warnings-feed fetch failure, MUST continue to result in no warnings shown (unchanged from current behavior — indistinguishable from "genuinely none" by design).

### Key Entities

- **Weather warning (extended)**: The existing official-warning entity now also carries whether it is currently active or upcoming, and — when upcoming — its expected start time for display.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A warning published for the viewer's location that has not yet started, but starts within the near-term window, is visible in the app before it goes active — 0% of such warnings remain invisible until they start.
- **SC-002**: 100% of upcoming warnings shown are visually/textually distinguishable from active ones, including their expected start time.
- **SC-003**: 0 regressions to existing active-warning display, ordering, or dismissal behavior.

## Assumptions

- "Near future" / the bounded near-term window defaults to 48 hours out — a warning starting more than 48 hours from now stays hidden until it falls inside that window. This mirrors the timeframe a viewer would reasonably plan around (e.g. "will it arrive tomorrow?") without cluttering the banner with far-future notices.
- The warnings feed itself already contains each warning's `approximateStart`; no new data source is needed, only a change in which warnings are included and how they're labeled.
- "Starts in X" display format (relative vs. absolute local time) is a presentation detail left for planning, not a scope decision.
