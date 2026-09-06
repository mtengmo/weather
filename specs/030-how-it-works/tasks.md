---

description: "Task list for 'How This Works' Documentation Page"
---

# Tasks: "How This Works" Documentation Page

**Input**: Design documents from `/specs/030-how-it-works/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the spec; a regression test is added per this session's
established practice.

**Organization**: Single user story (P1) — the entire feature is one small, cohesive change.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

Not applicable — no new project setup.

---

## Phase 2: Foundational

Not applicable — no shared prerequisite beyond the panel itself; it reuses `PrivacyNotice.tsx`'s
existing CSS family in `src/index.css` without needing any changes to it (research.md §1).

---

## Phase 3: User Story 1 - Understand what the app does and where its data comes from (Priority: P1) 🎯 MVP

**Goal**: A footer control opens a static, plain-language panel explaining the app's views,
observed-vs-forecast distinction, data sources, UV risk indicator, and warning banner; closing it
returns the user to their exact prior screen/state.

**Independent Test**: From any screen, open "How this works" via the footer; it explains the
app's core views and data sources; closing it returns to the exact same screen unchanged (per
quickstart.md).

### Implementation for User Story 1

- [X] T001 [US1] Create `src/components/HowItWorks.tsx` — a `role="dialog"` panel with an
      `aria-label` (e.g. "How this works"), a close button calling an `onClose` prop, and static
      content covering (FR-002): what the app shows overall; the 24-hour/3-day/7-day views; the
      observed (solid) vs. forecast (dashed) distinction; the SMHI/Open-Meteo/MET Norway data
      sources and how they're blended; the UV risk indicator; and the weather-warning banner —
      mirroring `PrivacyNotice.tsx`'s exact structure, per contracts/how-it-works-panel.md
- [X] T002 [US1] In `src/components/Footer.tsx`, add a second `useState<boolean>` (e.g.
      `howItWorksOpen`) and a second `<button type="button">` labeled "How this works" alongside
      the existing "Privacy" button, conditionally rendering `<HowItWorks onClose={...} />` the
      same way `privacyOpen`/`PrivacyNotice` already work
- [X] T003 [P] [US1] Add/extend CSS in `src/index.css` for the new panel's content layout,
      reusing the existing `.privacy-notice*` rules rather than duplicating them (research.md §1)
- [X] T004 [P] [US1] Add an integration test in `tests/integration/footer.test.tsx` asserting:
      clicking "How this works" opens the panel; its text mentions the 24h/3-day/7-day views,
      observed-vs-forecast, the data sources, UV risk, and warnings; closing it removes the panel
      from the DOM without changing the underlying screen's own content (e.g. the still-selected
      location's name remains present and unchanged)

**Checkpoint**: Feature complete — the panel is reachable from every screen the footer appears
on, covers every required topic, and closes without side effects.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T005 Run `TZ=UTC npx vitest run` and fix any regressions introduced by T001-T004
- [X] T006 Run `npm run lint` and fix any issues
- [X] T007 Run `npm run build` and confirm a clean build
- [X] T008 Start `npm run dev` and manually walk through quickstart.md's steps: open/close from
      the Overview, Details/graph, and Map views; check on a narrow (mobile-width) viewport for
      readability with no horizontal scrolling
- [X] T009 Bump `package.json`'s version as the final step before commit, per standing practice

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: Skipped — not applicable
- **User Story 1 (Phase 3)**: The entire feature; no dependencies
- **Polish (Phase 4)**: Depends on User Story 1 being complete

### Within Phase 3

- T001 → T002 (the footer button needs the component to render) → T003 (styling, can follow
  immediately) → T004 (test, exercises T001+T002 together)

### Parallel Opportunities

- T003 and T004 are mutually parallel once T001/T002 exist.

---

## Implementation Strategy

### MVP First (and only)

1. Complete Phase 3: User Story 1 (the entire feature)
2. **STOP and VALIDATE**: Run quickstart.md's manual check across all three main views and a
   narrow viewport
3. Phase 4 polish pass → commit + push (per standing memory: commit+push automatically after
   `/speckit-implement`, with the version bump from T009 included in that same commit)
