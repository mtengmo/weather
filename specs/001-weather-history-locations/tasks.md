---

description: "Task list template for feature implementation"
---

# Tasks: Weather Observation History for Current Position and Favorite Places

**Input**: Design documents from `/specs/001-weather-history-locations/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included — plan.md's Project Structure explicitly designs `tests/unit` and `tests/integration` (Vitest + React Testing Library).

**Organization**: Tasks are grouped by user story. **Regeneration note**: User Stories 1–4 (current-location/favorite graphs, favorites management, location switching, nearby-station comparison) are already fully implemented and tested from prior rounds — this task list covers only the new scope from the 2026-08-31 clarification: **User Story 5, theming** (Midnight/Ivory/Glass, user-selectable, persisted). No tasks are generated for US1–US4 beyond a brief regression check.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US5 here)

## Path Conventions

Single frontend-only project per plan.md: `src/` and `tests/` at repository root.

---

## Phase 1: Setup

**Purpose**: Confirm no new dependencies are needed

- [X] T001 Confirm no new npm dependency is required (research.md §14 — theming is plain CSS custom properties, no library); skip straight to Foundational

**Checkpoint**: N/A — nothing to install

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The theme type, persistence service, and CSS token tables every part of US5 depends on

**⚠️ CRITICAL**: No US5 UI work can begin until this phase is complete

- [X] T002 [P] Add `Theme` type (`"midnight" | "ivory" | "glass"`) to `src/models/types.ts` per [data-model.md](./data-model.md)
- [X] T003 [P] Implement `src/services/theme.ts` (`getThemePreference`, `setThemePreference`, `applyTheme`) per [contracts/theme-service.md](./contracts/theme-service.md) — `localStorage`-backed, defaults to `"midnight"`, `applyTheme` sets `data-theme` on `document.documentElement`
- [X] T004 [P] Define CSS custom-property token tables for all three themes in `src/index.css`: `:root` (or `[data-theme="midnight"]`) as the default, plus `[data-theme="ivory"]` and `[data-theme="glass"]` — tokens: `--bg`, `--surface`, `--text`, `--text-muted`, `--accent`, `--border`, plus `--surface-blur`/`--surface-alpha` for Glass (research.md §14)
- [X] T005 [P] Unit test `src/services/theme.ts` (default value when unset, persistence round-trip, invalid stored value falls back to `"midnight"`, `applyTheme` sets the attribute) in `tests/unit/theme.test.ts`

**Checkpoint**: `theme.ts` is correct and CSS tokens exist for all three themes — ready for UI wiring

---

## Phase 3: User Story 5 - Choose a visual theme (Priority: P5)

**Goal**: Let the user pick among Midnight/Ivory/Glass; the choice applies instantly across every screen and persists across reloads.

**Independent Test**: Switch between the three themes and confirm the app's visual styling (background, typography, accent color) changes accordingly on every screen, and that the choice persists after a reload.

### Implementation for User Story 5

- [X] T006 [US5] Implement `hooks/useThemePreference.ts` wrapping `services/theme.ts`: exposes `{ theme, setTheme }`, calls `applyTheme` on mount and whenever `theme` changes (mirrors `useUnitPreference.ts`)
- [X] T007 [US5] Build `src/components/ThemePicker.tsx`: a 3-option control (Midnight/Ivory/Glass) using `aria-pressed` per option, same pattern as `UnitToggle.tsx`
- [X] T008 [US5] Wire `ThemePicker` into `src/App.tsx` header via `useThemePreference`, alongside the existing `UnitToggle`
- [X] T009 [US5] Rework `src/index.css` so every existing hardcoded color (`.error-banner`, `.gap-point`, table borders, button/legend styling, chart container background, etc.) reads from the theme tokens defined in T004 (`var(--bg)`, `var(--surface)`, `var(--text)`, etc.) instead of fixed values — this is what makes FR-024 ("consistently across every screen") true, not just the top-level background
- [X] T010 [US5] Add Glass-specific surface styling (translucent panels via `--surface-alpha`/`backdrop-filter: blur(--surface-blur)`) scoped to `[data-theme="glass"] .app-header, [data-theme="glass"] .observation-table-wrap, [data-theme="glass"] .favorites, [data-theme="glass"] .error-banner` (or equivalent), since Glass is visually distinct from a plain light/dark palette swap
- [X] T011 [P] [US5] Unit/component test: `useThemePreference` defaults to `"midnight"`, applies `data-theme` on mount, and updates it when `setTheme` is called, in `tests/unit/theme.test.ts` (extends T005) or a small hook test file
- [X] T012 [P] [US5] Component test: `ThemePicker` renders three options, calls `onChange`-equivalent correctly, and reflects the active theme via `aria-pressed`, in `tests/integration/chartAndDetails.test.tsx` or a new `tests/integration/theme.test.tsx`

**Checkpoint**: All three themes are selectable, apply app-wide, and persist — User Story 5 is independently functional and doesn't affect US1–US4's behavior (only their styling)

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, regression safety, and end-to-end validation

- [X] T013 [P] Verify text/background contrast meets a reasonable readability bar (e.g. WCAG AA-ish, eyeballed since no automated a11y tool is wired in) in all three themes, adjusting token values from T004 if any combination is hard to read
- [X] T014 Re-run the full existing test suite (`npm test`) to confirm the CSS/token rework in T009–T010 didn't change any US1–US4 behavior (styling-only change, no assertions should need updating)
- [ ] T015 Run through [quickstart.md](./quickstart.md) Scenario 9 (themes) manually and fix any gaps found
- [X] T016 [P] Update `README.md` to mention the theme picker alongside the existing unit-toggle mention

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — trivial, confirms nothing to install
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS US5 (the type, service, and CSS tokens are load-bearing for every US5 task)
- **US5 (Phase 3)**: Depends on Foundational only; independent of US1–US4 (styling-only, no data/behavior dependency)
- **Polish (Phase 4)**: Depends on US5 being complete

### Parallel Opportunities

- T002, T003, T004, T005 in parallel (Foundational — different files)
- T011, T012 in parallel (US5 tests)
- T013, T016 in parallel (Polish)

---

## Parallel Example: Foundational Phase

```bash
# Launch the theme type/service/CSS-token/test work together:
Task: "Add Theme type to src/models/types.ts"
Task: "Implement src/services/theme.ts per contracts/theme-service.md"
Task: "Define CSS custom-property tokens for all three themes in src/index.css"
Task: "Unit test src/services/theme.ts in tests/unit/theme.test.ts"
```

---

## Implementation Strategy

### Single Increment (US5 is the only new story this round)

1. Complete Phase 1: Setup (trivial)
2. Complete Phase 2: Foundational (type, service, CSS tokens)
3. Complete Phase 3: User Story 5 (picker, wiring, CSS rework)
4. **STOP and VALIDATE**: run quickstart.md Scenario 9, confirm the full test suite still passes
5. Complete Phase 4: Polish (contrast check, README)
6. Demo: switch themes and see every screen restyle instantly, persisting across reload

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This is a styling-only feature: no FR in this round changes data, layout structure, or behavior (spec Assumptions), so T014's full-suite regression run is the primary safety check, not new behavioral tests
- Commit after each task or logical group
