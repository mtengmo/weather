# Research: Update SMHI Symbol Icons to Ver6 Artwork

## 1. Confirming the checkerboard-not-alpha problem is real and consistent

**Decision**: Treat the source sheet as fully opaque RGB with a baked-in fake-transparency checkerboard, not as an image with real alpha to simply extract.

**Rationale**: Verified directly — `Image.open(...).convert("RGBA")` on ver3/ver4/ver5/ver6 all report alpha channel min=max=255 (fully opaque, one unique value). Visual inspection of ver6 confirms a faint two-tone checker (~RGB 249-251 and ~240-245, difference of only ~6-10 levels) rendered as literal pixels across the whole background. This has been consistent across four separately generated sheets (ver3 glow-background RGBA that also turned out fully opaque on closer look, ver4/ver5/ver6 explicit checkerboard), so a fifth regeneration is not expected to differ — confirmed with the user, who chose to proceed with ver6 rather than request another.

**Alternatives considered**: Waiting for a sheet with real alpha — rejected per explicit user decision after three failed regeneration attempts.

## 2. Grid geometry

**Decision**: `symbols_logos_ver6.png` is 1024×1536px, a clean 5-column × 6-row grid, cell size exactly 204.8×256px (1024/5, 1536/6) — no gutters, no drift observed between cells. 30 cells total, 27 used (codes 1-27, reading left-to-right/top-to-bottom), last row's remaining 3 cells empty/background-only.

**Rationale**: Confirmed by cropping and visually inspecting cells 1, 6, 10, 11, 14, 15, 20, 21, 24, 25, 26, 27 at the computed boundaries — every numeral and icon lands inside its expected cell with no bleed from neighboring cells.

## 3. Separating background from icon content: flood-fill from cell corners, not a global threshold

**Decision**: Per cell, classify a pixel as "background-candidate" when it's bright and nearly achromatic (`min(R,G,B) > 225` and `max(R,G,B) - min(R,G,B) < 10` — covers both checker shades, ~240-251). Then flood-fill (4-connected BFS) starting from all four corner pixels of the cell, moving only through background-candidate pixels. Every pixel reached becomes transparent (alpha 0); everything else keeps its original color at full opacity.

**Rationale**: A pure color threshold would also match a cloud's own white interior (often ~255,255,255, which passes the same brightness/achromatic test) — visually confirmed on cells 6, 10, 14, 21, 26 (angry/dark clouds, lightning bolt, snow cloud) that every icon's white/light regions are fully enclosed by a darker outline stroke, never touching the cell border. Flood fill from the corners therefore cannot leak into an enclosed white interior — it's blocked by the outline — while still clearing every bit of the actual checkerboard field, since that field is one connected region touching all four corners. This is the same principle as a "magic wand"/paint-bucket tool.

**Alternatives considered**:
- *Global threshold, no flood fill* (mark every background-candidate pixel transparent regardless of position): rejected — would punch holes into legitimate white cloud interiors and light highlight streaks, visibly breaking icons like #6, #14, #26.
- *Per-pixel distance from a single sampled background color*: rejected — same problem, and additionally the checker's two shades already span a wider range than most icons' own outline-to-fill contrast, so a single-color distance threshold can't cleanly separate them without also risking leakage.

## 4. Removing the number label

**Decision**: After the flood-fill background removal, additionally force a fixed rectangle in each cell's top-left corner — `(x: 0-95, y: 0-72)` relative to the cell's own top-left — fully transparent, regardless of what's there.

**Rationale**: The numeral (1-2 digits, plain sans-serif) is not connected to the flood-filled background field the same way an icon's interior isn't (it's dark, isolated foreground), so flood fill alone would leave it floating as an opaque digit with no icon around it. Every one of the 27 cells was inspected (either directly or via the earlier per-cell dark-pixel bounding-box scan) and in every case the numeral sits well within this box with generous clearance from the icon artwork — including the tightest cases (#1's sun rays, #10's cloud, #14's dark cloud, #21's lightning bolt, #26's snow cloud) — so this fixed box is safe across all 27 cells without clipping any icon.

**Alternatives considered**: Detecting the numeral by color/shape per cell (as 043's ver2 script did with a numeral-whiteout box tuned per grid) — unnecessary here since a single fixed box already covers every case; adds complexity without benefit.

## 5. Output convention

**Decision**: Save the 27 crops as `docs/logos/symbols_ver6_icons/<same-27-filenames-as-today>.png` (matching `043-smhi-27-symbol-icons`'s `_ver2_icons/` convention as the "source of truth" checked into the repo), then copy them over the existing files at `src/assets/weather-icons/<filename>.png`. Filenames are unchanged from what `smhiSymbolIcons.ts` already imports, so no code/import changes are needed (FR-004/SC-002).

**Rationale**: Matches established project convention from 043; keeps the diff to image bytes only.
