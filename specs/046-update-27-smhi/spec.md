# Feature Specification: Update SMHI Symbol Icons to Ver4 Artwork

**Feature Branch**: `046-update-27-smhi`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "update weather icons from this png file: symbols_logos_ver4.png"

Context: `043-smhi-27-symbol-icons` shipped 27 distinct icons (one per SMHI `symbol_code`, 1-27), built specifically so the artwork could be replaced later without touching the code-to-situation mapping. `044-update-icons-ver3` began a similar swap to a "ver3" reference sheet but was never carried through to implementation (spec and a partial plan only — no icons were ever extracted or swapped in). The user has now supplied a fourth reference sheet, `docs/logos/symbols_logos_ver4.png`, and wants the app's 27 icons updated to match it. This feature supersedes 044 — 044's incomplete ver3 work is not carried forward.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the newest icon artwork throughout the app (Priority: P1)

A viewer looking at any weather icon backed by an SMHI symbol code (dashboard timeline, Details table) sees the new ver4 artwork instead of whatever artwork is currently bundled (ver2, from the last completed icon swap), for all 27 situations.

**Why this priority**: This is the entire request — swap the visual artwork to the user's latest reference sheet.

**Independent Test**: Open the dashboard and Details view for an SMHI-covered location and confirm every rendered SMHI-code icon matches the new ver4 reference sheet, not the previously bundled artwork.

**Acceptance Scenarios**:

1. **Given** a forecast period with a known SMHI `symbol_code`, **When** the viewer looks at its icon, **Then** it matches the new ver4 artwork for that code, not the previously bundled artwork.
2. **Given** every one of the 27 codes, **When** each is looked up, **Then** each still resolves to its own distinct icon — the update changes *which* graphic is shown per code, not the one-to-one mapping itself.
3. **Given** a period with no SMHI symbol code (unaffected by this feature per prior features' scope), **When** the viewer looks at its icon, **Then** nothing about it changes.

---

### User Story 2 - The swap doesn't require re-deriving anything (Priority: P2)

Whoever performs this update (the user, or an assistant on their behalf) only needs to replace the 27 image files — no code change to the lookup table's structure, the mapping logic, or any consuming component.

**Why this priority**: This is exactly the property `043-smhi-27-symbol-icons` was built to provide; this is its second real test (044 didn't reach implementation to test it).

**Independent Test**: Confirm the update touches only image asset files (and, if needed, the source reference-cropping step), not `src/components/smhiSymbolIcons.ts`'s structure or any component that consumes it.

**Acceptance Scenarios**:

1. **Given** the new artwork is in place, **When** the code-to-icon lookup table is inspected, **Then** it still has exactly 27 entries, unchanged in structure — only the underlying image each entry points at has changed.

---

### Edge Cases

- What happens if the new reference sheet's layout or background differs from previous ones (it does — a different image mode from the ver3 sheet)? The extraction approach must adapt; the *output* (27 individual, text/number-free icon files) must still match the same convention already established (043-smhi-27-symbol-icons, research.md §3).
- What happens to the never-completed ver3 work (`docs/logos/smhi_symbols_ver3.png`, `specs/044-update-icons-ver3/`)? Superseded by this feature; left as a cleanup question for the user alongside the older ver2 assets/scripts, consistent with how that question has been raised (and left open) at the end of prior icon features.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every one of the 27 SMHI-symbol-code icons currently shown in the app MUST be replaced with the corresponding icon from the ver4 reference sheet.
- **FR-002**: The replacement MUST preserve the existing one-code-to-one-icon mapping structure — no code's icon goes missing, and no two codes end up sharing an icon.
- **FR-003**: The new icons MUST be free of any number badge or caption text baked into the image, matching the existing icon style already used in the app (established in 043-smhi-27-symbol-icons).
- **FR-004**: No component or lookup-table code structure outside the image assets themselves MUST need to change for this update.
- **FR-005**: Every part of the app unaffected by SMHI-symbol-code icons (other providers, daily/weekly views) MUST remain unchanged.

### Key Entities

- **Icon artwork revision**: The specific set of 27 image files backing `SMHI_SYMBOL_ICONS`; this feature is the "ver4" revision, superseding the "ver2" set currently bundled (043-smhi-27-symbol-icons) and the never-completed "ver3" attempt (044-update-icons-ver3).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 27 SMHI-code icons rendered in the app reflect the ver4 artwork after this change.
- **SC-002**: 0 code changes to `src/components/smhiSymbolIcons.ts`'s exported structure, or to any consuming component, are required (only the image files/imports they reference change).
- **SC-003**: 0 regressions in behavior for periods without an SMHI symbol code.

## Assumptions

- "Update weather icons" means updated artwork for the same 27 SMHI situations, not a change in how many icons exist or which situations are distinguished — the code-to-situation mapping from 043-smhi-27-symbol-icons is unchanged.
- The ver4 reference sheet's layout/format is purely a source-file detail; extracting 27 individual icons from it is an implementation concern for planning, not a scope change.
- Feature 044's incomplete ver3 artifacts (spec, partial plan, un-cropped reference image) are abandoned in favor of this feature; no ver3 code or assets were ever integrated, so there is nothing to roll back.
- Cleanup of now-superseded ver2/ver3 assets and scripts is left as an open question for the user, not decided by this spec (mirroring how it was left open at the end of prior icon features).
