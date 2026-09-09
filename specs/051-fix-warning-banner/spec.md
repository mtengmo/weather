# Feature Specification: Fix Warning Banner Colors to Match Real Severity

**Feature Branch**: `051-fix-warning-banner`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "The yellow warning is red, use the colors from the warning levels."

Context: Diagnosed directly against SMHI's live public warnings feed. SMHI's real, currently-used severity codes are `MESSAGE`, `YELLOW`, `ORANGE`, `RED` — confirmed live (a real active warning for Uppsala right now is coded `YELLOW`). The app's severity ordering and banner color styling were built assuming `MESSAGE`, `CLASS_1`, `CLASS_2`, `CLASS_3` instead (028-severe-weather-warnings' original, evidently outdated, assumption). Since `YELLOW` doesn't match any of the app's `.warning-level-*` color rules, the banner falls back to its own default red/error-colored container styling — so a genuinely Yellow-level warning displays looking exactly like the most severe (Red) one, which is what the user is seeing and reporting.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A warning's color matches its real severity (Priority: P1)

A viewer looking at the warning banner sees a Yellow-level warning styled distinctly from an Orange or Red one — not all rendered identically in the banner's most-severe (red) styling.

**Why this priority**: This is the entire request — the banner's whole purpose is to communicate severity at a glance, and right now every color-coded warning looks equally alarming regardless of its real level.

**Independent Test**: Mock one active Yellow-level warning; confirm the banner renders it with Yellow-associated styling, not the same styling a Red-level warning would get.

**Acceptance Scenarios**:

1. **Given** an active Yellow-level warning, **When** the viewer looks at the banner, **Then** it's styled distinctly from Orange and Red, not defaulted to red/error styling.
2. **Given** an active Orange-level warning, **When** the viewer looks at the banner, **Then** it's styled distinctly from Yellow and Red.
3. **Given** an active Red-level warning, **When** the viewer looks at the banner, **Then** it's styled as the most severe of the three.
4. **Given** a location with both a Yellow and a Message-level warning active (the Message one already routed to the Today card per 048), **When** the viewer looks at the banner, **Then** only the Yellow one appears there, correctly colored.

---

### Edge Cases

- What happens if SMHI ever does publish a code the app doesn't recognize (a legacy `CLASS_1`-style code, or a future one)? Falls back to the banner's existing neutral/default styling rather than crashing or defaulting to red — an unrecognized severity shouldn't visually overstate urgency.
- What happens to sorting when multiple color-coded warnings are active at once? Red sorts above Orange, which sorts above Yellow — matching the real-world severity order, not the previous (incorrect) `CLASS_1/2/3` ordering.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST recognize SMHI's real severity codes — `MESSAGE`, `YELLOW`, `ORANGE`, `RED` — for both sorting and color styling.
- **FR-002**: Yellow, Orange, and Red warnings MUST each render with visually distinct styling reflecting their real relative severity, not a shared default.
- **FR-003**: An unrecognized severity code MUST NOT be styled as if it were the most severe (Red) — it falls back to a neutral treatment.
- **FR-004**: Sorting among multiple active color-coded warnings MUST reflect Yellow < Orange < Red.
- **FR-005**: This fix MUST NOT change anything about Message-level warnings' own routing/display (048-split-informational-smhi is unaffected).

### Key Entities

- **Warning severity**: SMHI's own scale, corrected from the app's previous (incorrect) `CLASS_1/2/3` assumption to the real `MESSAGE`/`YELLOW`/`ORANGE`/`RED` codes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Yellow/Orange/Red warnings render with color styling matching their real severity, verified against a live example of each.
- **SC-002**: 0 color-coded warnings default to red/error styling due to an unrecognized code.
- **SC-003**: 0 regressions to Message-level warning routing/display (048).

## Assumptions

- SMHI's documented/legacy `CLASS_1/2/3` codes may still appear on older or cached data; the fix recognizes both the old and new code names defensively, but the real-world, currently-observed codes (`YELLOW`/`ORANGE`/`RED`) are the primary target.
- No change to *which* warnings appear where (banner vs. Today card) — this is a color-mapping-only fix, not a routing change.
