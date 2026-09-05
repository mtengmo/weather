# Feature Specification: Dashboard Polish Round Six

**Feature Branch**: `021-dashboard-polish-round-six`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "1. forecast timestamp, must exists a real timestamp then it was created from SMHI that you can print out? At least it exists in SMHI app. 2. Do you merge forecast with multiple now? I don't see it, nothing mention about it. 3. The shadow of the location favo's blend to much with background. 4. Use same icons on the 7d forecast thumbnails, as on the other forecast. 5. Always bump version during implementation. 6. The rain procent, is that possible to have to the right of the rain number on the forecast, so the 0 on the barchart starts at same height."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See when the forecast was actually issued (Priority: P1)

A user wants to see a genuine "forecast issued at" timestamp from SMHI, the same one SMHI's own app shows, not a substitute.

**Why this priority**: The freshness timestamp currently shown has never actually reflected SMHI's real forecast-issued time — it silently falls back to the app's own fetch time on every load, which is a real, previously-undetected defect in a just-shipped feature.

**Independent Test**: Load the dashboard for an SMHI-covered location; confirm the freshness time shown matches SMHI's own published forecast-issue time for that location (comparable to what SMHI's own app/site shows), not simply "whenever this app last fetched."

**Acceptance Scenarios**:

1. **Given** a location covered by SMHI with a current forecast, **When** the freshness time is shown, **Then** it reflects SMHI's own forecast-issued time, not the app's fetch time.
2. **Given** SMHI's forecast-issued time genuinely isn't available (e.g. SMHI's forecast couldn't be fetched at all), **When** the freshness time is shown, **Then** it falls back to the app's own last-fetch time rather than showing nothing.

---

### User Story 2 - See clear evidence the forecast blends both sources (Priority: P1)

A user wants unambiguous, visible confirmation that the forecast shown is a genuine blend of SMHI and Open-Meteo, not just told about it in release notes.

**Why this priority**: Directly follows up on a just-shipped "always-averaged forecast" behavior the user can't currently find evidence of — undermines trust that the feature is actually working.

**Independent Test**: View a forecast period where both sources have data; confirm there's a clear, discoverable indication (in the timeline itself and/or the footer) that the value is a blend of two sources, not a single-source reading.

**Acceptance Scenarios**:

1. **Given** a forecast period where both SMHI and Open-Meteo have data, **When** that period is shown, **Then** the display makes clear the value is an averaged/blended reading.
2. **Given** the footer or another summary area, **When** the user looks for confirmation that multiple sources feed the forecast, **Then** that confirmation is present and easy to find.

---

### User Story 3 - An accurate rain forecast bar chart (Priority: P1)

A user looking at the Rain row expects every bar to start from the same zero baseline, regardless of whether a rain-probability percentage is also shown for that period.

**Why this priority**: A real, visible chart-accuracy defect — a period showing a rain-probability percentage currently renders its bar starting from a different baseline than periods without one, making the row misleading.

**Independent Test**: View a set of forecast periods where some have a rain-probability percentage and some don't; confirm every bar's bottom edge lines up at the same height regardless.

**Acceptance Scenarios**:

1. **Given** a forecast period with a rain-probability percentage and a period without one, **When** both are shown on the Rain row, **Then** their bars share the same zero baseline.
2. **Given** a period with a rain-probability percentage, **When** it's shown, **Then** the percentage is positioned so it no longer pushes that period's bar out of alignment with its neighbors.

---

### User Story 4 - Readable location panel in every theme (Priority: P2)

A user opening the location/favorites panel expects its edge to be clearly visible against the page behind it, in every theme.

**Why this priority**: A legibility/polish issue — the panel is still usable, just visually harder to distinguish from the page in the default theme.

**Independent Test**: Open the location panel (with at least one favorite) in the default theme; confirm its edge/shadow is clearly distinguishable from the page background behind it.

**Acceptance Scenarios**:

1. **Given** the default theme is active, **When** the location panel is open over other page content, **Then** its boundary is clearly visible against the page behind it.

---

### User Story 5 - Consistent forecast icons everywhere (Priority: P2)

A user comparing the 7-day forecast strip's day icons to the main timeline's condition icons expects them to look the same.

**Why this priority**: A visual-consistency polish item — the underlying icons are already the same set, just inconsistently sized across the app.

**Independent Test**: Compare a day's icon in the 7-day forecast strip against the same condition's icon on the main timeline; confirm matching size/presentation.

**Acceptance Scenarios**:

1. **Given** the same underlying condition, **When** its icon is shown in the 7-day forecast strip versus the main timeline, **Then** the two are visually consistent (same size).

---

### User Story 6 - The app version visibly advances with each release (Priority: P3)

A user (or maintainer) checking the footer's version number expects it to change with each meaningful release, not stay frozen indefinitely.

**Why this priority**: A process/housekeeping concern rather than a user-facing defect — lowest priority, but worth fixing once.

**Independent Test**: Compare the version number shown in the footer before and after this round of changes ships; confirm it has advanced.

**Acceptance Scenarios**:

1. **Given** this round of changes is released, **When** the footer's version number is checked, **Then** it's higher than the version shown before this round shipped.

---

### Edge Cases

- What happens when SMHI's forecast-issued time and the app's own fetch time are far apart (e.g. a stale cached forecast)? The genuinely-issued time is still shown as-is — never adjusted or hidden — so the user can judge staleness for themselves.
- What happens when only one source has data for a period (no blending possible)? No blended-source indicator is shown for that period — indicating a blend only when one genuinely happened, never implying blending that didn't occur.
- What happens to the rain row when neither a bar nor a probability value exists for a period? The existing no-data gap indicator is shown, unaffected by this change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The forecast freshness time shown to the user MUST reflect SMHI's own published forecast-issued time whenever SMHI contributed to the forecast and that time is available from SMHI.
- **FR-002**: When SMHI's own forecast-issued time isn't available, the app MUST fall back to its own last-fetch time rather than showing no freshness information at all.
- **FR-003**: Whenever a forecast period's value is a blend of two sources, the display MUST make that fact clearly visible to the user without requiring them to open any menu.
- **FR-004**: The Rain row's bars MUST share a consistent zero baseline across all periods, regardless of whether a rain-probability percentage is shown alongside any of them.
- **FR-005**: A rain-probability percentage, when shown, MUST be positioned so it doesn't alter that period's bar height or baseline relative to its neighbors.
- **FR-006**: The location/favorites panel MUST be clearly visually distinguishable from the page content behind it in the default theme.
- **FR-007**: The 7-day forecast strip's condition icons MUST match the main timeline's condition icons in size and presentation.
- **FR-008**: The app's displayed version number MUST advance with this round of changes, and MUST continue to advance with each subsequent implementation round going forward.
- **FR-009**: None of the above changes MUST alter the app's existing gap-vs-fabrication behavior — a period or value with no underlying data continues to show the existing no-data indicator rather than an invented value.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The forecast freshness time shown matches SMHI's own published forecast-issue time for an SMHI-covered location, verified against SMHI's own published data.
- **SC-002**: A user can identify, without opening any menu, when a forecast value is a blend of two sources.
- **SC-003**: In a Rain row with a mix of periods with and without a rain-probability percentage, every bar's baseline aligns within a pixel of every other bar's baseline.
- **SC-004**: The location panel's edge remains clearly visible against the page behind it in the default theme, verified visually.
- **SC-005**: A side-by-side comparison of the 7-day strip and the main timeline shows matching icon sizing for the same condition.
- **SC-006**: The footer's version number after this round is strictly greater than before it, and this holds for every future round as well.

## Assumptions

- "A real timestamp... from SMHI" (User Story 1) refers to SMHI's own point-forecast API response, which includes a genuine forecast-issued/reference time distinct from the app's own fetch-completion time — the fix threads that real value through instead of the placeholder that was silently substituted.
- User Story 2's "clear evidence" is satisfied by a visible marker on the blended value itself (already partially present) plus a corresponding mention in the footer's disclosure text, so the confirmation isn't limited to a single spot a user might miss.
- User Story 6's version bump is a per-release process expectation (bump the app's version number as part of finishing each implementation round), not a new runtime feature — it's included here so it's tracked and verified like the other changes in this round.
