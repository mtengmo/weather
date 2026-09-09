# Tasks: Update SMHI Symbol Icons to Ver6 Artwork

**Input**: Design documents from `/specs/047-update-27-smhi/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No code changes occur (asset-only feature, FR-004/SC-002), so no new automated tests are added. Validation is visual spot-check (per quickstart.md) plus running the existing full test suite to confirm zero regressions.

**Organization**: Grouped by user story from spec.md.

## Phase 1: Setup

- [X] T001 Confirm `docs/logos/symbols_logos_ver6.png` is present and is a 1024×1536, 5-column × 6-row grid (cell size 204.8×256px) as documented in research.md §2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build and validate the extraction script that both user stories depend on.

- [X] T002 Create `docs/logos/split_symbols_ver6.py`: for each of the 27 codes (1-27), compute its cell bounds from the 5×6 grid (`row = (code-1)//5`, `col = (code-1)%5`, `x0=col*204.8, y0=row*256`, etc.), crop the cell, convert to RGBA.
- [X] T003 In the same script, implement the flood-fill background removal per cell (research.md §3): classify a pixel as background-candidate when `min(R,G,B) > 225 and max(R,G,B)-min(R,G,B) < 10`; 4-connected BFS/flood-fill from the four corner pixels through background-candidate pixels only; set alpha=0 for every reached pixel, alpha=255 (unchanged RGB) for every other pixel.
- [X] T004 In the same script, after flood-fill, force the fixed numeral-clear rectangle `(x: 0-95, y: 0-72)` relative to each cell's own top-left corner fully transparent (alpha=0), per research.md §4.
- [X] T005 In the same script, autotrim each resulting crop to its non-transparent bounding box (consistent with 043's existing icon convention — no large empty margins) and save to `docs/logos/symbols_ver6_icons/<code>-<slug>.png` using the exact 27 filenames already listed in `src/components/smhiSymbolIcons.ts` (`01-clear.png` … `27-heavy-snowfall.png`).
- [X] T006 Run `python3 docs/logos/split_symbols_ver6.py` and confirm it produces exactly 27 files with no errors.

**Checkpoint**: 27 clean, transparent, number-free icon crops exist under `docs/logos/symbols_ver6_icons/`, ready to validate and copy in.

---

## Phase 3: User Story 1 - See the newest icon artwork throughout the app (Priority: P1) 🎯 MVP

**Goal**: The app renders the ver6 artwork for all 27 SMHI codes, with a transparent background and no leftover checkerboard/number.

**Independent Test**: Open the dashboard/Details view for an SMHI-covered location and visually confirm every SMHI-code icon matches ver6 artwork with no checkerboard/box.

### Validation for User Story 1

- [X] T007 [P] [US1] Visually spot-check the trickiest extracted crops per quickstart.md: the sun (code 1, rays reach near cell edge), the two-digit-numeral cases (codes 10-27), and the darkest/densest icons (the angry gray cloud, the purple thunderstorm cloud, the lightning-bolt character, the snow-covered clouds) — confirm no number visible, no checkerboard/box visible, and no missing chunks of icon content.
- [X] T008 [US1] If any crop from T007 shows a defect (numeral not fully cleared, a corner of checkerboard left behind, or a piece of icon clipped), adjust the relevant constant in `split_symbols_ver6.py` (the background-candidate threshold from T003, or the numeral-clear rectangle from T004) and re-run T006, re-checking only the affected crop(s).

### Implementation for User Story 1

- [X] T009 [US1] Copy all 27 files from `docs/logos/symbols_ver6_icons/` over the existing files at `src/assets/weather-icons/` (same filenames, overwriting in place — no import changes needed in `src/components/smhiSymbolIcons.ts`).
- [X] T010 [US1] Update the doc comment above `SMHI_SYMBOL_ICONS` in `src/components/smhiSymbolIcons.ts` to reference this feature (047) and the ver6 source, replacing the existing ver2 reference (mirroring how 043's comment described its own source).
- [X] T011 [US1] Run `npm run dev` and manually check the dashboard timeline and Details table for a Sweden-based location, confirming the new artwork renders with no checkerboard/box and matches ver6.

**Checkpoint**: User Story 1 fully functional — every SMHI-code icon in the running app shows the ver6 artwork cleanly.

---

## Phase 4: User Story 2 - The swap doesn't require re-deriving anything (Priority: P2)

**Goal**: Confirm the swap touched only image assets (plus the doc-comment update), not the lookup table's structure or any consumer.

**Independent Test**: Diff `src/components/smhiSymbolIcons.ts` and every file that imports from it against the pre-feature state; confirm no structural change beyond the doc comment.

### Validation for User Story 2

- [X] T012 [US2] Run `git diff` (or equivalent) against `src/components/smhiSymbolIcons.ts`, `src/components/WeatherIconOverview.tsx`, and `src/components/ObservationDetails.tsx` (or wherever `resolveConditionIcon`/`resolveConditionIconFromCondition` are consumed) — confirm the only change in `smhiSymbolIcons.ts` is the T010 doc comment, and zero changes in every consumer.

**Checkpoint**: Both user stories independently verified.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T013 [P] Run `npm run lint`.
- [X] T014 [P] Run `npx tsc -b` (full build).
- [X] T015 Run `npm test` (full suite) — expect zero failures and zero new tests needed, since no application code changed.
- [X] T016 Run `npm run build` to confirm the production build succeeds with the new image assets.
- [X] T017 Bump the `version` field in `package.json` (patch bump) per project convention.
- [X] T018 Commit all changes and push per project convention (commit message describing the ver6 icon swap, `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` trailer). Include `docs/logos/symbols_logos_ver6.png`, `docs/logos/split_symbols_ver6.py`, and `docs/logos/symbols_ver6_icons/` as the new source-of-truth artifacts, alongside the updated `src/assets/weather-icons/*.png` files.

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1. **Blocks** Phase 3 — the crops must exist before they can be validated or copied in.
- **Phase 3 (US1)**: Depends on Phase 2. Independently testable/deliverable as the MVP.
- **Phase 4 (US2)**: Depends on Phase 3 (there must be a completed swap to verify against). Purely a verification pass — no new code.
- **Phase 5 (Polish)**: Depends on Phases 3 and 4 being complete.

## Implementation Strategy

**MVP = Phase 1 + 2 + 3**: ships the actual artwork swap the user asked for. Phase 4 is a quick structural-integrity check (confirming FR-004/SC-002 held), and Phase 5 is standard pre-commit verification.

## Implementation Notes (deviations from the original task text)

- **T003/T004**: The fixed numeral-clear rectangle originally planned in research.md §4 proved insufficient during T007/T008 validation — numeral position varies enough between cells (observed y up to ~99, not the assumed ≤72) that a fixed box left visible digit fragments on some icons (e.g. code 13). Replaced with connected-component analysis: after flood-fill background removal, label the remaining foreground into components; the single largest component is always the icon body; any other component fully inside a top-left zone (`x<150, y<140`) and under 900px area is the numeral and gets cleared. This also surfaced and fixed a second, unplanned defect: code 15's cell contained a sliced fragment of code 10's water-splash artwork bleeding down from the cell above (the source sheet's own art overflows its nominal cell boundary there) — generalized as "any non-largest, non-numeral component touching the cell's top edge is a bleed fragment from the cell above" (real icon detail like raindrops/ice cubes only ever touches the *bottom* edge, confirmed by survey, never the top).
- **T011**: `npm run dev` was started but a live browser check wasn't performed in this environment (no browser tool available). In its place, all 27 extracted crops were visually inspected directly as image files (via T007/T008, covering every risk category: sun rays near cell edge, dark clouds, water pours, lightning, snow, and the cross-cell bleed case) before being copied into `src/assets/weather-icons/`, which is the actual content that renders in the app — equivalent coverage for an asset-only change with no rendering-logic changes.
