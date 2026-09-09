# Feature Specification: Collapse Informational Warnings in the Today Card, With a Drill-Down

**Feature Branch**: `052-collapse-informational-warnings`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "In the mobile app, it's alot more details (too much on the screen) about the water level compared to the web. Maybe possible to add a drill down to see all details on the warning from the daily summary?" — combined with "Skip showing water level warnings or these very low levels warnings," resolved via clarification: keep a minimal line in the Today card (just the warning's short title), with the full detail available on a click/tap rather than always shown inline.

Context: `048-split-informational-smhi` routed SMHI's Message-level warnings (e.g. "Risk for water shortage") into the Today card as a short title-plus-full-description line. In practice this reads as too much text competing with the card's other everyday-glance content — the user compared it to SMHI's own mobile app, which apparently shows the same level of warning detail but behind a more deliberate view, not inline. This feature collapses the Today card's own display down to just the warning's title, and adds a way to reveal the full detail on demand.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Today card shows just a title, not the full warning text (Priority: P1)

A viewer glancing at the Today card sees an active informational warning as a short, single line (its title only) — not its full description crowding the rest of the card's content.

**Why this priority**: This is the direct complaint — the current inline full-text treatment is too much detail for a glance-first card.

**Independent Test**: Mock an active informational warning with a long description; confirm the Today card shows only its title, not the description text, by default.

**Acceptance Scenarios**:

1. **Given** an active informational warning, **When** the viewer looks at the Today card, **Then** only its title is shown there, not its description.
2. **Given** no active informational warning, **When** the viewer looks at the Today card, **Then** nothing changes (unchanged from today).

---

### User Story 2 - The full detail is one interaction away (Priority: P1)

A viewer who wants the full detail behind a Today-card warning title can reveal it with a single, obvious action, then dismiss that detail view without losing their place.

**Why this priority**: Equally essential — collapsing the text must not make the information unreachable, just not always-on.

**Independent Test**: Click/tap the warning title in the Today card; confirm the full description becomes visible; confirm it can be closed again.

**Acceptance Scenarios**:

1. **Given** a collapsed informational warning title in the Today card, **When** the viewer clicks/taps it, **Then** its full description (and any other available detail, e.g. area/validity) becomes visible.
2. **Given** the full detail is showing, **When** the viewer clicks/taps again (or an explicit close control), **Then** it collapses back to just the title.
3. **Given** multiple active informational warnings, **When** the viewer expands one, **Then** the others remain independently collapsed/expanded — expanding one doesn't affect another.

---

### Edge Cases

- What happens on a touch device where "hover" isn't available? The reveal action is a tap/click, not a hover — works identically on touch and pointer input.
- What happens to the drill-down's open/closed state across a re-render (e.g. new data arriving)? Not required to persist — each warning starts collapsed; this is a lightweight glance-first affordance, not a saved preference.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Today card MUST show only an active informational warning's title by default, not its full description.
- **FR-002**: The viewer MUST be able to reveal that warning's full description via a single click/tap on the title.
- **FR-003**: The viewer MUST be able to collapse an expanded warning back down.
- **FR-004**: Multiple informational warnings MUST expand/collapse independently of one another.
- **FR-005**: This feature MUST NOT change anything about color-coded (Yellow/Orange/Red) warnings, which remain in the standalone banner (048/051), unaffected.

### Key Entities

- **Informational warning (Today card)**: Now has two display states — collapsed (title only, the default) and expanded (title plus full description) — toggled per warning, independently.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the Today card's informational-warning lines show title-only by default.
- **SC-002**: 100% of collapsed warnings reveal their full description in one interaction.
- **SC-003**: 0 regressions to color-coded warning banner behavior.

## Assumptions

- "All details on the warning" means the same description text already carried on the warning (048's existing `WeatherWarning.description`) — no new data field or fetch is needed.
- A simple expand/collapse (accordion-style) toggle satisfies "drill down" — no separate page/modal is required, keeping this consistent with the existing `WarningBanner`'s own collapsed/expanded pattern for its list of warnings.
