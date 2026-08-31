---

description: "Task list template for feature implementation"
---

# Tasks: Vibrant "Award-Worthy" Theme and Elevated Graph Styling

**Input**: Design documents from `/specs/002-vibrant-award-theme/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not explicitly requested in the feature spec. Light regression assertions are still included where research.md explicitly calls for a verifiable check (contrast ratios, label/identifier resolution), consistent with this repo's existing testing conventions — these are not a full TDD gate.

**Organization**: Tasks are grouped by user story (US1, US2 from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Exact file paths are included in every task description

## Path Conventions

Single frontend-only project (per [plan.md](./plan.md)): `src/`, `tests/` at repository root. No new directories are introduced by this feature.

---

## Phase 1: Setup

**Purpose**: Confirm the existing project baseline before making visual changes. No new dependencies, tooling, or structure are needed (plan.md — no new charting/design-system library).

- [X] T001 Run `npm install`, `npm run test`, and `npm run build` at the repo root to confirm a clean baseline before edits; no code changes in this task.

**Checkpoint**: Baseline confirmed green — safe to start Foundational work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Introduce the one new shared styling primitive both user stories rely on, per the [theme-css-variables.md](./contracts/theme-css-variables.md) contract.

**⚠️ CRITICAL**: Must complete before US2 (chart gradient styling) begins; US1 does not strictly require it but it's cheap to land first since it touches the same file.

- [X] T002 Add the `--accent-2` CSS custom property to all three theme blocks (`[data-theme="midnight"]`, `[data-theme="ivory"]`, `[data-theme="glass"]`) in `src/index.css`, using the values from [data-model.md](./data-model.md) (`#3a7d7a` deep teal for midnight, `#00d4b5` electric lime/cyan for ivory, `#67e8f9` soft cyan for glass). Do not change any other property in these blocks yet.

**Checkpoint**: `--accent-2` is defined and readable under every theme — US1 and US2 can now proceed (US2 depends on this; US1 does not).

---

## Phase 3: User Story 1 - Select the new vibrant theme (Priority: P1) 🎯 MVP

**Goal**: The theme picker's light-theme slot (identifier `"ivory"`) presents a bright, near-white, high-saturation "popping colors" palette instead of the old soft-cream "Ivory" look, labeled "Bright," applied consistently across the whole app and persisted exactly like before.

**Independent Test**: Open the theme picker, select "Bright," and confirm every screen (graphs, details page, favorites, controls) switches to the new bright/vibrant palette; reload and confirm it persists; simulate a pre-existing `"ivory"` value in `localStorage` and confirm it resolves to the new palette with no error (quickstart.md scenario 1).

### Implementation for User Story 1

- [X] T003 [US1] Redefine the `[data-theme="ivory"]` block in `src/index.css` with the new bright/vibrant palette per [research.md](./research.md) §1: `--bg: #fffdf9`, `--surface: #ffffff`, `--text: #151316`, `--accent: #e01050`, `--border` updated to a crisper neutral, and revisit `--text-muted`/`--error-bg`/`--error-text`/`--error-border` for contrast against the brighter background (do not touch the `--accent-2` line added in T002).
- [X] T004 [US1] In `src/components/ThemePicker.tsx`, change the `THEMES` entry label for `value: "ivory"` from `"Ivory"` to `"Bright"` (identifier unchanged) per [research.md](./research.md) §3.
- [X] T005 [P] [US1] Compute and record WCAG 2.1 contrast ratios for the new "Bright" palette in `tests/unit/theme.test.ts`: `--text` on `--bg`, `--text` on `--surface`, `--accent` on `--bg`, and each of the six `SERIES_COLORS` (`src/components/seriesColors.ts`) against the new `--bg`/`--surface`, per [research.md](./research.md) §6; assert each pairing meets the 4.5:1 (text) / 3:1 (graphical) WCAG thresholds.
- [X] T006 [US1] Extend `tests/unit/theme.test.ts` to assert the picker still renders the label `"Bright"` for the `"ivory"` identifier, and that `getThemePreference()`/`setThemePreference()`/`applyTheme()` in `src/services/theme.ts` are unchanged and still round-trip the `"ivory"` value correctly (FR-003a regression coverage — no migration code exists, so this test documents that guarantee).
- [X] T007 [US1] Run [quickstart.md](./quickstart.md) scenario 1 manually in the browser: verify the picker shows "Midnight" / "Bright" / "Glass", switching to "Bright" restyles every screen with no reload, and pre-seeding `localStorage` with `"ivory"` before reload lands directly on the new palette.

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable — the new theme exists, is selectable, persists, and is legible.

---

## Phase 4: User Story 2 - See weather graphs with elevated visual polish (Priority: P2)

**Goal**: The 24-hour and 7-day observation graphs get theme-aware chrome (grid lines, axis text, legend, tooltip) and a gradient-filled precipitation bar with an active-point highlight, applied under all three themes (not only "Bright"), without changing any data, aggregation, or existing series-distinguishing technique.

**Independent Test**: View the 24-hour and 7-day graphs under each of the three themes and confirm the grid/axis/tooltip visually match that theme (not Recharts' unstyled defaults), the precipitation bar shows a gradient fill, and all series (including up to 5 nearby-station comparisons) remain distinguishable and legible (quickstart.md scenarios 2–3).

### Implementation for User Story 2

- [X] T008 [US2] In `src/index.css`, add themed CSS rules scoped under each `[data-theme="..."]` selector targeting Recharts' stable class names — `.recharts-cartesian-grid line` (stroke via `var(--border)`), `.recharts-cartesian-axis-tick-value`/`.recharts-text` (fill via `var(--text-muted)`), and `.recharts-legend-item-text` (color via `var(--text)`) — per [research.md](./research.md) §4.
- [X] T009 [US2] In `src/components/ObservationChart.tsx`, add a themed `contentStyle`/`itemStyle`/`labelStyle` object to both `<Tooltip>` elements (24-hour and 7-day charts), using `var(--surface)`, `var(--border)`, and `var(--text)` so the tooltip (Recharts inline-styled) tracks the active theme, per [research.md](./research.md) §4 and the [theme-css-variables.md](./contracts/theme-css-variables.md) contract.
- [X] T010 [US2] In `src/components/ObservationChart.tsx`, add a `<defs><linearGradient>` (fading the primary series color to transparent, using `var(--accent-2)` as a highlight stop) and apply it as the `fill` for the `primaryPrecipitation` `<Bar>` in both the 24-hour and 7-day charts, replacing the current flat `fillOpacity={0.3}` fill, per [research.md](./research.md) §5.
- [X] T011 [US2] In `src/components/ObservationChart.tsx`, enable `activeDot` on the primary temperature `<Line>` (`dataKey="primary"` in the 24-hour chart, `dataKey="primaryAverage"` in the 7-day chart) so hovering highlights the active point, per [research.md](./research.md) §5. Do not change `nearbyStations` line props (dash/dot behavior stays as-is — FR-006).
- [X] T012 [US2] Run [quickstart.md](./quickstart.md) scenarios 2–3 manually in the browser: confirm gradient fill + activeDot + themed grid/axis/tooltip appear under all three themes on both graph windows, and that a location with up to 5 nearby comparison stations still shows every series as distinguishable with no legibility loss against the new "Bright" background.

**Checkpoint**: User Stories 1 and 2 both work independently and together — the app now has a bright, vibrant theme option and visually elevated graphs under every theme.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final whole-app validation after both stories are complete.

- [X] T013 [P] Run `npm run lint` and `npm run test` at the repo root to confirm no regressions from the CSS/component changes.
- [X] T014 [P] Run `npm run build` to confirm the app still builds cleanly for GitHub Pages deployment (plan.md — no build/deploy config changes expected).
- [X] T015 Run the full [quickstart.md](./quickstart.md) validation end-to-end (all 4 scenarios, including the "no functional regression" scenario 4) as a final sign-off.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. Blocks US2 (T008–T011 all use `var(--accent-2)` or share `src/index.css` with T002); US1 does not depend on it but T003 touches the same file as T002, so completing T002 first avoids merge friction.
- **User Story 1 (Phase 3)**: Depends on Foundational completion (for file-ordering reasons above). No dependency on US2.
- **User Story 2 (Phase 4)**: Depends on Foundational completion (needs `--accent-2`, T002). Does not depend on US1's palette values — the chrome/gradient work applies identically regardless of which theme is active — but both stories touch `src/index.css` and `src/components/ObservationChart.tsx`/`ThemePicker.tsx` is US1-only, so running US1 before US2 avoids any incidental merge overlap in `index.css`.
- **Polish (Phase 5)**: Depends on both user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Independently testable after Foundational. No dependency on US2.
- **User Story 2 (P2)**: Independently testable after Foundational. No dependency on US1 (graph chrome styling applies under all themes, including the unchanged "Midnight" and "Glass").

### Within Each User Story

- US1: palette (T003) and label (T004) before verification/tests (T005–T006) before manual validation (T007).
- US2: CSS chrome (T008) and tooltip styling (T009) can proceed alongside the gradient/activeDot changes (T010–T011) since they touch different concerns in the same file — sequence T008→T009→T010→T011 to avoid editing `ObservationChart.tsx` in conflicting ways, then validate (T012).

### Parallel Opportunities

- T005 (contrast-ratio test) can run in parallel with T004 (label change) — different files (`tests/unit/theme.test.ts` vs. `src/components/ThemePicker.tsx`).
- T013 and T014 (lint/test vs. build) can run in parallel in Phase 5.
- US1 and US2 could be assigned to different developers in parallel once Phase 2 completes, provided both coordinate on non-overlapping edits within `src/index.css` (US1 owns the `[data-theme="ivory"]` block's core colors; US2 owns the `.recharts-*` chrome rules added under each theme block).

---

## Parallel Example: User Story 1

```bash
# After T003 and T004 are done, these can run together:
Task: "Compute and record WCAG contrast ratios for the new palette in tests/unit/theme.test.ts"
Task: "Extend tests/unit/theme.test.ts to assert the 'Bright' label and 'ivory' identifier round-trip"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (`--accent-2` added to all three theme blocks).
3. Complete Phase 3: User Story 1 — the new "Bright" theme is live, selectable, persisted, and legible.
4. **STOP and VALIDATE**: Run quickstart.md scenario 1 independently.
5. This alone satisfies the user's core ask ("really nice theme... bright light one with popping colors") and can ship/demo before graph polish lands.

### Incremental Delivery

1. Setup + Foundational → baseline confirmed, `--accent-2` available.
2. Add User Story 1 → validate independently → demo the new theme (MVP).
3. Add User Story 2 → validate independently → demo elevated graphs under all themes.
4. Polish → final lint/test/build/quickstart sign-off.

---

## Notes

- [P] tasks touch different files (or clearly non-overlapping regions of the same file) and have no unmet dependency.
- [Story] label maps each task to US1 or US2 for traceability back to spec.md.
- No new dependencies, components, hooks, services, or routes are introduced — every task edits one of three existing files (`src/index.css`, `src/components/ObservationChart.tsx`, `src/components/ThemePicker.tsx`) or one existing test file (`tests/unit/theme.test.ts`).
- Commit after each task or logical group; stop at either checkpoint to validate a story independently before continuing.
