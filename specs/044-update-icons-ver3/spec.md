# Feature Specification: Update SMHI Symbol Icons to Ver3 Artwork

**Feature Branch**: `044-update-icons-ver3`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "update the icons with new visualization from smhi_symbols_ver3.png"

Context: `043-smhi-27-symbol-icons` shipped 27 distinct icons (one per SMHI `symbol_code`, 1-27), built specifically so the artwork could be replaced later without touching the code-to-situation mapping (its User Story 3/FR-005). The user has now supplied a third reference sheet, `docs/logos/smhi_symbols_ver3.png` (a single-column layout, one icon per code, distinct from the previous two references' grid layout), and wants the app's 27 icons updated to match it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the newest icon artwork throughout the app (Priority: P1)

A viewer looking at any weather icon backed by an SMHI symbol code (dashboard timeline, Details table) sees the new ver3 artwork instead of the previous (ver2) artwork, for all 27 situations.

**Why this priority**: This is the entire request — swap the visual artwork the user has now finalized (or is iterating toward).

**Independent Test**: Open the dashboard and Details view for an SMHI-covered location and confirm every rendered SMHI-code icon matches the new ver3 reference sheet, not the old one.

**Acceptance Scenarios**:

1. **Given** a forecast period with a known SMHI `symbol_code`, **When** the viewer looks at its icon, **Then** it matches the new ver3 artwork for that code, not the previous artwork.
2. **Given** every one of the 27 codes, **When** each is looked up, **Then** each still resolves to its own distinct icon — the update changes *which* graphic is shown per code, not the one-to-one mapping itself.
3. **Given** a period with no SMHI symbol code (unaffected by this feature per the prior feature's scope), **When** the viewer looks at its icon, **Then** nothing about it changes.

---

### User Story 2 - The swap doesn't require re-deriving anything (Priority: P2)

Whoever performs this update (the user, or an assistant on their behalf) only needs to replace the 27 image files — no code change to the lookup table's structure, the mapping logic, or any consuming component.

**Why this priority**: This is exactly the property `043-smhi-27-symbol-icons` was built to provide; this feature is the first real test of it.

**Independent Test**: Confirm the update touches only image asset files (and, if needed, the source reference-cropping step), not `src/components/smhiSymbolIcons.ts`'s structure or any component that consumes it.

**Acceptance Scenarios**:

1. **Given** the new artwork is in place, **When** the code-to-icon lookup table is inspected, **Then** it still has exactly 27 entries, unchanged in structure — only the underlying image each entry points at has changed.

---

### Edge Cases

- What happens if the new reference sheet's layout differs from the previous one (it does — a single column instead of a grid)? The extraction approach must adapt to the new layout; the *output* (27 individual, text/number-free icon files) must still match the same convention already established (043-smhi-27-symbol-icons, research.md §3).
- What happens to the previous (ver2) icon files and cropping scripts once ver3 is in place? Out of scope for this feature to decide unilaterally — left as a cleanup question for the user, consistent with how the same question was raised (and left open) at the end of the previous feature.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every one of the 27 SMHI-symbol-code icons currently shown in the app MUST be replaced with the corresponding icon from the ver3 reference sheet.
- **FR-002**: The replacement MUST preserve the existing one-code-to-one-icon mapping structure — no code's icon goes missing, and no two codes end up sharing an icon.
- **FR-003**: The new icons MUST be free of any number badge or caption text baked into the image, matching the existing icon style already used in the app (established in 043-smhi-27-symbol-icons).
- **FR-004**: No component or lookup-table code structure outside the image assets themselves MUST need to change for this update.
- **FR-005**: Every part of the app unaffected by SMHI-symbol-code icons (other providers, daily/weekly views) MUST remain unchanged.

### Key Entities

- **Icon artwork revision**: The specific set of 27 image files backing `SMHI_SYMBOL_ICONS`; this feature is the "ver3" revision, superseding the "ver2" set shipped in 043-smhi-27-symbol-icons.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 27 SMHI-code icons rendered in the app reflect the ver3 artwork after this change.
- **SC-002**: 0 code changes to `src/components/smhiSymbolIcons.ts`'s exported structure, or to any consuming component, are required (only the image files/imports they reference change).
- **SC-003**: 0 regressions in behavior for periods without an SMHI symbol code.

## Assumptions

- "New visualization" means updated artwork for the same 27 SMHI situations, not a change in how many icons exist or which situations are distinguished — the code-to-situation mapping from 043-smhi-27-symbol-icons is unchanged.
- The ver3 reference sheet's different layout (a single vertical column vs. the previous grid) is purely a source-file detail; extracting 27 individual icons from it is an implementation concern for planning, not a scope change.
- Cleanup of now-superseded ver2 assets/scripts is left as an open question for the user, not decided by this spec (mirroring how it was left open at the end of the previous feature).
