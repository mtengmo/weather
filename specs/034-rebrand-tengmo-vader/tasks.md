# Tasks: Rebrand to Tengmo Väder

**Input**: Design documents from `/specs/034-rebrand-tengmo-vader/`
**Prerequisites**: plan.md, research.md, data-model.md, quickstart.md

**Tests**: This feature updates two existing integration tests that assert the old brand string;
no new test files are added (per plan.md, no new components/behavior — pure rename + asset swap).

## Phase 1: Setup

- [X] T001 Regenerate `public/favicon-16.png`, `public/favicon-32.png`,
  `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png` from
  `docs/logos/tengmovader_icon_transluent.png` (16/32/180/192/512px respectively), using the
  scratchpad `imgtools/resize.mjs` sharp script pointed at the new source (research.md)

## Phase 2: Foundational (blocking prerequisites)

*No foundational/blocking work — all changes below are independent string/config edits.*

## Phase 3: User Story 1 - App carries the new name and logo (Priority: P1)

**Goal**: Every user-visible occurrence of "Weather History" becomes "Tengmo Väder"; icons already
regenerated in T001 are wired into the manifest/HTML.

**Independent Test**: Load the app locally, check tab title and footer text; check
`vite.config.ts`'s manifest name/short_name.

- [X] T002 [P] [US1] Edit `index.html`: change `<title>Weather History</title>` to
  `<title>Tengmo Väder</title>`
- [X] T003 [P] [US1] Edit `src/components/Footer.tsx`: change `<span>Weather History v{APP_VERSION}</span>`
  to `<span>Tengmo Väder v{APP_VERSION}</span>`
- [X] T004 [P] [US1] Edit `vite.config.ts`: change PWA manifest `name: "Weather History"` to
  `name: "Tengmo Väder"` and `short_name: "Weather"` to `short_name: "TengmoVäder"` (research.md
  §short_name)
- [X] T005 [P] [US1] Edit `README.md`: change the `# Weather History` heading to `# Tengmo Väder`
- [X] T006 [US1] Edit `tests/integration/footer.test.tsx`: update both `getByText(/Weather History v/)`
  assertions to `getByText(/Tengmo Väder v/)`
- [X] T007 [US1] Edit `tests/integration/appHeader.test.tsx`: update the "has no standalone 'Weather
  History' heading" test (name and `getByRole("heading", { name: "Weather History" })` query) to
  reference "Tengmo Väder" instead, preserving its intent (no standalone heading renders)

**Checkpoint**: `npm run test` passes; `npm run dev` shows "Tengmo Väder" in tab title and footer,
with the new icon set from T001 visible as the favicon.

---

## Phase 4: User Story 2 - Site is reachable at the new domain (Priority: P2)

**Goal**: GitHub Pages is configured to serve `vader.tengmo.com`; no in-repo runtime string still
references the old domain.

**Independent Test**: Inspect `public/CNAME` and `src/services/geocoding.ts` for the new domain;
after deploy, load `https://vader.tengmo.com/`.

- [X] T008 [P] [US2] Edit `public/CNAME`: replace `weather.tengmo.com` with `vader.tengmo.com`
- [X] T009 [P] [US2] Edit `src/services/geocoding.ts`: replace the `weather.tengmo.com` domain
  reference in `USER_AGENT` with `vader.tengmo.com`

**Checkpoint**: `npm run build` succeeds; after push, `https://vader.tengmo.com/` serves the app
(per quickstart.md scenario 4).

## Dependencies & Execution Order

- T001 (icon regeneration) has no dependents that need the actual files present to edit
  code/text — it can run in parallel with Phase 3/4 edits, but must complete before final
  verification (quickstart.md scenario 3).
- Phase 3 tasks T002-T005 are independent file edits (parallelizable); T006-T007 depend on the
  Footer.tsx/index.html text actually changing to know what to assert, but since the test files
  don't import the JSX strings directly, they can also be edited in parallel — sequenced here only
  for clarity of "implementation before its test update."
- Phase 4 tasks T008-T009 are independent of Phase 3 entirely.
- No cross-phase blocking dependencies — Phase 3 and Phase 4 can be done in any order.

## Implementation Strategy

Single small PR-sized change; do all tasks together (no meaningful partial-MVP split for a rename).
