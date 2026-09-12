# Feature Specification: Refresh the Woman Character's Icon Artwork (Sheets 1-6)

**Feature Branch**: `068-update-woman-icons`

**Created**: 2026-09-12

**Status**: Draft

**Input**: User description: "could you update images of flicka, 1-6."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Regenerate icons 1-6 from the newly supplied source images (Priority: P1)

The user has replaced the source sprite-sheet images numbered 1 through 6 with new versions of
the same files (the six sheets covering the clear/nearly-clear/variable/cloudy/overcast/fog
weather types across all six temperature bands — frozen, cold, near-zero, mild, warm, hot). They
want the app's corresponding weather icons regenerated from these new source images, using the
same file-splitting process and naming convention already established, so the app displays the
updated artwork with no other change in behavior.

**Why this priority**: The only story in this feature — a straightforward, self-contained visual
asset refresh identical in kind to the icon regeneration already done in 067-fix-rain-brief-icons,
just for a different subset of the source sheets.

**Independent Test**: Can be fully tested by running the icon-splitting process against the newly
supplied sheets 1-6 and confirming the app's weather icon artwork directory ends up with the same
72 individual icon files (6 sheets × 6 weather-type columns × day/night) it already has, now
showing the updated artwork, with every other icon file (from sheets 7-19) left untouched.

**Acceptance Scenarios**:

1. **Given** the user has replaced source sheets 1-6 with new versions, **When** the icon-splitting
   process is run, **Then** the app's weather icon artwork directory ends up with the same 72
   files (clear/nearly-clear/variable/cloudy/overcast/fog × frozen/cold/nearzero/mild/warm/hot ×
   day/night) it already has, now containing the new artwork, and every icon file that corresponds
   to a different source sheet (7 through 19) is unchanged.
2. **Given** the regenerated icons are in place, **When** the app is used normally, **Then** every
   place that previously showed one of these icons still shows one — nothing regresses to a
   missing image or a fallback icon.
3. **Given** the regenerated icons are in place, **When** the app's file size/asset-weight
   expectations from the most recent icon refresh (067-fix-rain-brief-icons) are checked, **Then**
   the newly regenerated files are brought down to the same lightweight size already established
   for the rest of the icon set, not left at the sprite-sheet's full uncompressed size.

---

### Edge Cases

- If the newly supplied sheets 1-6 don't cover every weather-type/day-night/temperature-band
  combination they're expected to (72 total), the regeneration must not silently leave stale
  (old-artwork) files in place for the missing combinations without it being noticed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app's weather icon artwork files corresponding to source sheets 1-6 MUST be
  regenerated from the newly supplied images, using the same splitting process and file-naming
  convention already established (063-replace-weather-icons, 067-fix-rain-brief-icons).
- **FR-002**: The regenerated icon artwork MUST cover the exact same 72 weather-type/day-night/
  temperature-band combinations already shipped for sheets 1-6 — no combination the app can
  currently display should end up missing a file after regeneration.
- **FR-003**: Regeneration MUST NOT alter any icon file that corresponds to a different source
  sheet (7 through 19) — this is a targeted refresh of sheets 1-6 only.
- **FR-004**: The regenerated icon artwork MUST NOT require any change to the app's icon-selection
  code — only the image files' visual content changes, at the same file paths and names.
- **FR-005**: The regenerated icon files MUST be brought to the same lightweight file size already
  established for the rest of the icon set (067-fix-rain-brief-icons' size-optimization step), not
  left at the sprite-sheet splitter's full, uncompressed output size.

### Key Entities

- **Weather icon artwork set (sheets 1-6 subset)**: The 72 individual icon image files generated
  from source sheets 1 through 6 — one per weather-type (clear, nearly-clear, variable, cloudy,
  overcast, fog) × day/night × temperature-band (frozen, cold, near-zero, mild, warm, hot)
  combination — refreshed here from newly supplied source images without changing the naming
  convention or affecting any other icon file.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After regeneration, all 72 icon files corresponding to source sheets 1-6 render the
  new artwork with zero missing-image or fallback-icon occurrences anywhere in the app.
- **SC-002**: Every icon file corresponding to source sheets 7-19 is byte-for-byte unchanged after
  this feature is complete.
- **SC-003**: The regenerated 72 files' total size is brought in line with the rest of the
  already-optimized icon set (same order of magnitude per file as the other 52 files already
  shipped), not left at the sprite-sheet splitter's much larger raw output size.

## Assumptions

- "Flicka, 1-6" refers to source sheets 1 through 6 (`docs/weathericons/01_kvinna-frozen.png`
  through `06_kvinna-hot.png`) — confirmed by inspecting the repository: these are exactly the six
  files the user has modified in place since the last icon refresh (067-fix-rain-brief-icons),
  while the sheets actually named with a "flicka" filename prefix (17-19, the snow-icon sheets)
  are unchanged on disk. The character name in the request doesn't match the sheets' internal
  filename prefix ("kvinna"), but the file-modification evidence is unambiguous about which six
  images the user actually replaced.
- This is a pure visual asset replacement — no new weather types, day/night variants, or
  temperature bands are being added or removed, and no other source sheet is touched.
- Reuses the exact same splitting (`split_icons.py`) and size-optimization (`resize_icons.py`)
  pipeline already established and already patched to run under this environment's Python version
  (067-fix-rain-brief-icons) — no new tooling is introduced.
