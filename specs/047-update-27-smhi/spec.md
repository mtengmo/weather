# Feature Specification: Update SMHI Symbol Icons to Ver6 Artwork

**Feature Branch**: `047-update-27-smhi`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "update weather icons from this png file: symbols_logos_ver6.png"

Context: `043-smhi-27-symbol-icons` shipped 27 distinct icons (one per SMHI `symbol_code`, 1-27), built specifically so the artwork could be replaced later without touching the code-to-situation mapping. Three follow-up attempts to swap in newer artwork (`044` on a "ver3" sheet, `046` on a "ver4" sheet) stalled before implementation once it became clear those reference sheets had no real transparency — just a checkerboard pattern drawn as opaque pixels, which would produce visibly imperfect icons if cropped naively. A "ver5" sheet had the same problem and was never turned into a feature. The user has now supplied a sixth reference sheet, `docs/logos/symbols_logos_ver6.png` (a 5-column × 6-row grid of 27 numbered cells), which has the same baked-in-checkerboard characteristic as ver3/ver4/ver5 — confirmed after three regeneration attempts to be a consistent limitation of the artwork-generation tool, not something a further regeneration is expected to fix. This feature proceeds with best-effort extraction from ver6 rather than waiting for a sheet with genuine alpha transparency, and supersedes 044 and 046 (both abandoned before implementation).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the newest icon artwork throughout the app (Priority: P1)

A viewer looking at any weather icon backed by an SMHI symbol code (dashboard timeline, Details table) sees the new ver6 artwork instead of whatever artwork is currently bundled (ver2, from the last completed icon swap), for all 27 situations, rendered with a transparent background — not the reference sheet's checkerboard.

**Why this priority**: This is the entire request — swap the visual artwork to the user's latest reference sheet, without the source file's checkerboard leaking into the app.

**Independent Test**: Open the dashboard and Details view for an SMHI-covered location and confirm every rendered SMHI-code icon matches the new ver6 artwork, sits on the app's own background (light or dark theme) with no checkerboard or box visible around it, not the previously bundled artwork.

**Acceptance Scenarios**:

1. **Given** a forecast period with a known SMHI `symbol_code`, **When** the viewer looks at its icon, **Then** it matches the new ver6 artwork for that code, not the previously bundled artwork, and shows no visible checkerboard/background box.
2. **Given** every one of the 27 codes, **When** each is looked up, **Then** each still resolves to its own distinct icon — the update changes *which* graphic is shown per code, not the one-to-one mapping itself.
3. **Given** a period with no SMHI symbol code (unaffected by this feature per prior features' scope), **When** the viewer looks at its icon, **Then** nothing about it changes.

---

### User Story 2 - The swap doesn't require re-deriving anything (Priority: P2)

Whoever performs this update (the user, or an assistant on their behalf) only needs to replace the 27 image files — no code change to the lookup table's structure, the mapping logic, or any consuming component.

**Why this priority**: This is exactly the property `043-smhi-27-symbol-icons` was built to provide; ver6 is the first ver3+ attempt to actually reach implementation and test it.

**Independent Test**: Confirm the update touches only image asset files (and the source reference-cropping step), not `src/components/smhiSymbolIcons.ts`'s structure or any component that consumes it.

**Acceptance Scenarios**:

1. **Given** the new artwork is in place, **When** the code-to-icon lookup table is inspected, **Then** it still has exactly 27 entries, unchanged in structure — only the underlying image each entry points at has changed.

---

### Edge Cases

- What happens where the extraction can't perfectly distinguish the source's checkerboard from genuinely light-colored icon content (e.g. a cloud's white highlight right at its edge)? Best-effort is accepted per the user's explicit choice after three regenerations showed the same limitation — a small amount of imperfection at extreme zoom is an acceptable trade-off against blocking on a sheet the tool can't produce. Visibly wrong results (e.g. a large chunk of an icon missing) are not acceptable and should be caught during validation.
- What happens to the abandoned ver3/ver4/ver5 reference sheets and any of their leftover scripts/specs? Superseded by this feature; left as a cleanup question for the user alongside the older ver2 assets/scripts, consistent with how that question has been raised (and left open) at the end of prior icon features.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every one of the 27 SMHI-symbol-code icons currently shown in the app MUST be replaced with the corresponding icon from the ver6 reference sheet.
- **FR-002**: The replacement MUST preserve the existing one-code-to-one-icon mapping structure — no code's icon goes missing, and no two codes end up sharing an icon.
- **FR-003**: The new icons MUST be free of any number badge or caption text baked into the image, and MUST NOT show the source sheet's checkerboard pattern — icons must render with a transparent background, matching the existing icon style already used in the app (established in 043-smhi-27-symbol-icons).
- **FR-004**: No component or lookup-table code structure outside the image assets themselves MUST need to change for this update.
- **FR-005**: Every part of the app unaffected by SMHI-symbol-code icons (other providers, daily/weekly views) MUST remain unchanged.

### Key Entities

- **Icon artwork revision**: The specific set of 27 image files backing `SMHI_SYMBOL_ICONS`; this feature is the "ver6" revision, superseding the "ver2" set currently bundled (043-smhi-27-symbol-icons) and the abandoned "ver3"/"ver4"/"ver5" attempts (044/046, neither ever implemented).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 27 SMHI-code icons rendered in the app reflect the ver6 artwork after this change, with no checkerboard or background box visible.
- **SC-002**: 0 code changes to `src/components/smhiSymbolIcons.ts`'s exported structure, or to any consuming component, are required (only the image files/imports they reference change).
- **SC-003**: 0 regressions in behavior for periods without an SMHI symbol code.

## Assumptions

- "Update weather icons" means updated artwork for the same 27 SMHI situations, not a change in how many icons exist or which situations are distinguished — the code-to-situation mapping from 043-smhi-27-symbol-icons is unchanged.
- The ver6 reference sheet's checkerboard is accepted as a known, unavoidable limitation (confirmed across ver3/ver4/ver5/ver6) rather than grounds to keep requesting new exports; extraction will use a best-effort technique to strip it, per the user's explicit decision.
- Feature 044's and 046's incomplete artifacts (specs, partial plans, un-cropped reference images for ver3/ver4) are abandoned in favor of this feature; no ver3/ver4 code or assets were ever integrated, so there is nothing to roll back.
- Cleanup of now-superseded ver2/ver3/ver4/ver5 assets, scripts, and spec directories is left as an open question for the user, not decided by this spec (mirroring how it was left open at the end of prior icon features).
