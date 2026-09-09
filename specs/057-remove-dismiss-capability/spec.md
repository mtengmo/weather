# Feature Specification: Remove Dismiss Capability From the Warning Banner

**Feature Branch**: `057-remove-dismiss-capability`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "how could I see already commited warnings? The warnings should not be possible to remove, except the notice." — resolved via clarification: remove the dismiss (×) button from the standalone alert banner entirely; the Today card's informational notice (048/052) already isn't dismissible and stays that way.

Context: The standalone warning banner (color-coded Yellow/Orange/Red warnings, `028-severe-weather-warnings`) has always let a viewer dismiss an individual warning, hiding it for as long as it remains that exact warning (`032-dashboard-polish-round-seven`). In practice, once dismissed, there's no way to see it again short of clearing the browser's local storage entirely — and a real safety warning being permanently hidden with no way back is a worse outcome than an unwanted persistent banner. This feature removes that dismiss capability from the banner; the Today card's informational notice was already never dismissible (048/052) and is unaffected.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An active warning can't be hidden (Priority: P1)

A viewer looking at the standalone warning banner has no way to dismiss/hide an individual warning — it remains visible for as long as it's active or upcoming, exactly as published.

**Why this priority**: This is the entire request — a warning that can be permanently hidden with no way to bring it back defeats the point of a safety warning.

**Independent Test**: Render the banner with an active warning; confirm there's no dismiss control anywhere in it, and the warning remains visible on every subsequent render.

**Acceptance Scenarios**:

1. **Given** an active or upcoming color-coded warning, **When** the viewer looks at the banner (collapsed or expanded), **Then** there is no dismiss/close control anywhere on it.
2. **Given** multiple warnings shown at once, **When** the viewer looks at the expanded list, **Then** none of them have a dismiss control.
3. **Given** the app is reloaded, **When** the viewer looks at the banner, **Then** every still-active/upcoming warning is shown — nothing from a previous session can suppress it.

---

### User Story 2 - The Today card's notice is unaffected (Priority: P2)

A viewer looking at the Today card's informational notice (048/052) sees no change — it was never dismissible and still isn't.

**Why this priority**: Confirms this feature's scope is exactly the banner, not a broader "remove all dismiss-like UI" change.

**Independent Test**: Render the Today card with an active informational warning; confirm its collapse/expand toggle still works exactly as before, with no dismiss control (none existed before this feature either).

**Acceptance Scenarios**:

1. **Given** an active informational warning, **When** the viewer looks at the Today card, **Then** its title/expand-to-detail behavior is unchanged from before this feature.

---

### Edge Cases

- What happens to a warning a viewer dismissed before this feature shipped (an id already recorded in their browser)? It simply stops mattering — with no dismiss control left to produce new dismissals and nothing left checking old ones, every active/upcoming warning shows regardless of any prior dismissal record.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The standalone warning banner MUST NOT offer any control to dismiss/hide an individual warning.
- **FR-002**: An active or upcoming color-coded warning MUST remain visible for as long as it's active/upcoming, with no way for the viewer to suppress it.
- **FR-003**: The Today card's informational-notice display and its collapse/expand behavior MUST be unaffected.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 dismiss controls remain anywhere on the standalone warning banner.
- **SC-002**: 100% of active/upcoming warnings remain visible across reloads, regardless of any prior dismissal history.
- **SC-003**: 0 regressions to the Today card's informational-notice behavior.

## Assumptions

- Any previously-recorded dismissal data in a viewer's browser is left in place (not actively cleared) — it simply becomes inert, since nothing reads it anymore. No migration step is needed.
