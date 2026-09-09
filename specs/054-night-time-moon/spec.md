# Feature Specification: Night-Time Moon Variants for Sun-Depicting Icons

**Feature Branch**: `054-night-time-moon`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "how would it be possible to improve the icons? take into other parameters like night/daytime, temperatur? what do you recommend? maybe you could send me prompts for new icons that I could use with Dalle"

Context: Of the two parameters raised, only day/night is a real gap worth closing. Temperature already implicitly shapes which of the 27 SMHI icons gets shown — SMHI itself decides between its rain/sleet/snow-family codes based on temperature before the data ever reaches this app, so no separate temperature-driven icon logic is needed here. Day/night is a genuine, previously-flagged gap: codes 1 (Clear sky), 2 (Nearly clear sky), 3 (Variable cloudiness), and 4 (Halfclear sky) all depict a sun in the current artwork (043/047/049-era icon sets), which looks wrong shown at 2am. This has already been called out as a known limitation in code comments for the *fallback* (non-SMHI-code) path, where a separate moon icon exists; the 27 SMHI-code icons themselves have never had a night counterpart.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A clear night shows a moon, not a sun (Priority: P1)

A viewer looking at a nighttime hour whose SMHI code is Clear sky, Nearly clear sky, Variable cloudiness, or Halfclear sky sees an icon depicting a moon (plain, or paired with a cloud for the partly-cloudy codes) instead of the daytime sun-based artwork.

**Why this priority**: This is the entire request — a sun icon at night is the one clearly wrong/confusing case in the current icon set.

**Independent Test**: Mock an hourly period with SMHI code 1 and a nighttime timestamp; confirm the moon-variant icon renders, not the sun one. Repeat for codes 2, 3, and 4.

**Acceptance Scenarios**:

1. **Given** an hourly period with SMHI code 1 (Clear sky) and a nighttime timestamp, **When** the viewer looks at its icon, **Then** a moon-based icon renders, not the sun one.
2. **Given** the same code at a daytime timestamp, **When** the viewer looks at its icon, **Then** the existing sun-based icon renders unchanged.
3. **Given** SMHI codes 2, 3, and 4 at nighttime timestamps, **When** the viewer looks at each icon, **Then** each shows its own moon-based counterpart (e.g. moon partly behind a cloud for the partly-cloudy codes), not its sun-based daytime artwork.
4. **Given** any of SMHI codes 5-27 (none of which depict a sun today), **When** the viewer looks at their icons at any time of day, **Then** nothing changes — day/night doesn't apply to codes that were never sun-based.

---

### Edge Cases

- What determines "night" for this purpose? The same simple clock-hour boundary already used elsewhere in this app for day/night (before 06:00 or at/after 20:00, local time) — no new rule invented.
- What about daily/weekly (non-hourly) periods, which never carry an SMHI code at all? Unaffected — this feature only applies where an hourly period's own SMHI code is present, consistent with how the existing 27-icon system already only applies there.
- What happens to the fallback (non-SMHI-code) path's existing separate sun/moon icons? Unchanged — this feature is scoped to the SMHI-code icon set specifically.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: An hourly period with SMHI code 1, 2, 3, or 4 at a nighttime hour MUST show a moon-based icon variant instead of its current sun-based artwork.
- **FR-002**: The same codes at a daytime hour MUST continue to show the existing sun-based artwork, unchanged.
- **FR-003**: SMHI codes 5 through 27 MUST be unaffected by this feature — no new variants, no behavior change.
- **FR-004**: The one-code-to-one-icon mapping's structure MUST otherwise remain intact — day/night is an additional lookup dimension for exactly four codes, not a redesign of the mapping.
- **FR-005**: Daily/weekly periods (which never carry an SMHI code) MUST remain unaffected.

### Key Entities

- **Night-variant icon**: Four new icon images, one each for codes 1-4, depicting the same situation with a moon in place of the sun — otherwise matching the existing artwork's style.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of nighttime hourly periods with SMHI code 1, 2, 3, or 4 show a moon-based icon.
- **SC-002**: 100% of daytime hourly periods with those same codes continue showing the existing sun-based icon.
- **SC-003**: 0 changes to any of SMHI codes 5-27's icons or to the fallback (non-SMHI-code) icon path.

## Assumptions

- "Improve the icons... take into other parameters" is resolved to day/night only — temperature is already handled upstream by SMHI's own code selection, so no additional temperature-based icon logic is added by this feature.
- New artwork for the four night variants is sourced the same way prior icon sets were (a user-supplied reference sheet); this spec covers the app-side selection logic and the mapping slot for that artwork, not the artwork's creation itself.
- Night-time detection reuses the app's existing simple clock-hour rule (before 06:00 or at/after 20:00) rather than a sunrise/sunset-based one, matching how day/night is already decided elsewhere in the app (e.g. the fallback condition path).
