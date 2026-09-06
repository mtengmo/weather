# Feature Specification: Restore Rain Chance & Remove Overview Blend Count

**Feature Branch**: `024-restore-rain-chance`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "1. also remove the 'avg of 3', just remove [it] from the screen. Enough with the footer. 2. The max rain % is gone, add it back, but don't change the horizontal level of the barchart."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The rain-probability percentage is reliably shown again (Priority: P1)

A user looking at the Rain row expects to see the chance-of-rain percentage next to the mm amount, the way it used to — it has stopped appearing.

**Why this priority**: A genuine regression in a previously-working, user-visible feature — the underlying data is available from the same provider already supplying the rest of the forecast, so its absence is a real defect, not a design choice.

**Independent Test**: View the Rain row for a forecast period where rain is expected; confirm a chance-of-rain percentage is shown next to the mm value, positioned so it doesn't shift that period's bar baseline relative to its neighbors (matching the existing inline layout already in place for this).

**Acceptance Scenarios**:

1. **Given** a forecast period has a genuine rain-probability reading from the app's own weather data, **When** the Rain row is shown, **Then** the percentage is displayed next to the mm value.
2. **Given** the percentage is shown for some periods and absent for others, **When** the Rain row bars are compared, **Then** every bar's baseline still aligns at the same height regardless — restoring the percentage must not reintroduce the earlier baseline-misalignment defect.
3. **Given** a period genuinely has no rain-probability data from any source, **When** that period is shown, **Then** it shows no percentage at all, never a fabricated one.

---

### User Story 2 - The Overview no longer shows a source-count on blended values (Priority: P2)

A user looking at the Overview's blended forecast values no longer wants to see "(avg of 3)" (or "(avg)") next to them — the footer already discloses which sources contributed, and repeating that detail inline on every value is unwanted.

**Why this priority**: A deliberate simplification request, not a defect — lower priority than restoring the missing rain data.

**Independent Test**: View a forecast period whose value blends multiple sources; confirm no "(avg)"-style text appears next to it, while the value itself remains the blended average as before.

**Acceptance Scenarios**:

1. **Given** a forecast period's value blends 2 or more sources, **When** it is shown on the Overview, **Then** no "(avg)" or "(avg of N)" text appears next to it — only the value itself.
2. **Given** the same period, **When** the user checks the footer, **Then** the footer's own source disclosure is unaffected and continues to name the contributing sources as it already does.

### Edge Cases

- What happens when only one source has rain-probability data for a period? That source's own reading is shown, unaffected by this change.
- What happens to the underlying blended-value calculation when the "(avg)" text is removed? The value itself is unchanged — only its inline text annotation is removed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST surface a genuine rain-probability reading on the Rain row whenever the app's own weather data provides one, regardless of which underlying source that reading came from.
- **FR-002**: The rain-probability percentage MUST continue to be positioned so it never shifts a period's bar baseline relative to its neighbors, matching the existing inline-with-the-value layout.
- **FR-003**: The Overview MUST NOT display an "(avg)" or "(avg of N)" annotation next to a blended forecast value.
- **FR-004**: Removing the Overview's blend-count annotation MUST NOT affect the blended value itself, nor the footer's own source-name disclosure.
- **FR-005**: Neither change may fabricate data — a period or value with no underlying reading continues to show the existing no-data indicator rather than an invented value.

### Key Entities

- **Rain Probability**: The chance-of-rain percentage for a forecast period, now sourced from whichever underlying provider(s) genuinely supply it, not limited to a single one.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A forecast period with a genuine rain-probability reading shows that percentage on the Rain row, verified across a range of real locations and forecast sources.
- **SC-002**: Every Rain-row bar's baseline aligns within a pixel of every other bar's baseline, with or without a percentage shown, verified visually.
- **SC-003**: No forecast value on the Overview shows an "(avg)"-style annotation, verified visually across 2-source and 3-source blended periods alike.

## Assumptions

- "The max rain %" (User Story 1) refers to the chance-of-rain percentage shown on the Rain row (011-precipitation-chance), which stopped appearing in practice once the app's primary weather source's own forecast became more reliable (021-dashboard-polish-round-six's coordinate-rounding fix) — that source's own rain-probability field exists in its data but was never wired into the app, so its readings were silently missing wherever it now supplies the forecast, even though the feature itself (and its inline, baseline-safe layout) was never removed from the code.
- "Enough with the footer" (User Story 2) is understood as: the footer's existing source-name disclosure remains exactly as-is; only the Overview's separate, per-value "(avg)" annotation is removed as redundant.
