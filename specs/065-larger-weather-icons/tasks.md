# Tasks: Larger Weather Icons

**Input**: Design documents from `specs/065-larger-weather-icons/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included, per this project's established convention.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npm run build` pass.

## Phase 2: User Story 1 - See the character artwork clearly, not as a tiny blur of detail (Priority: P1) 🎯 MVP

**Goal**: All four existing icon placements render visibly larger, Today card stays the largest,
no layout regression.

**Independent Test**: Load the app; compare rendered icon size at each of the four placements
against today; confirm layout still fits everywhere.

- [X] T002 [P] [US1] In `src/components/TodaySummaryCard.tsx`, change the weather icon's
      `width`/`height` (img branch) and `size` (lucide-fallback branch) from `40` to `64`
      (research.md §1).
- [X] T003 [US1] In `src/index.css`, change `.today-summary-character`'s `height` from `40px` to
      `64px` to keep the 061 cartoon-companion character in sync with the enlarged weather icon it
      sits beside (research.md §3).
- [X] T004 [P] [US1] In `src/components/WeatherIconOverview.tsx`'s hourly timeline `ConditionRow`,
      change the weather icon's `width`/`height`/`size` from `28` to `44` (research.md §1).
- [X] T005 [P] [US1] In `src/components/ObservationDetails.tsx`, change the Details table's weather
      icon `width`/`height`/`size` from `28` to `44`.
- [X] T006 [P] [US1] In `src/components/WeeklyForecastStrip.tsx`, change the 7-day strip's weather
      icon `width`/`height`/`size` from `28` to `44`.
- [X] T007 [US1] In `tests/integration/weatherIconOverview.test.tsx`, update/add assertions that
      the Today card renders its icon at 64px and the timeline/Details table/7-day strip each
      render at 44px (SC-001).
- [X] T008 [US1] Manually verify in the browser per quickstart.md step 2: Today card stays the
      largest icon (FR-002), the timeline still scrolls horizontally with no clipping/overlap
      (FR-003), and the `windy` fallback icon matches the artwork's new size (FR-004).

**Checkpoint**: User Story 1 fully delivered — no other stories in this feature.

## Phase 3: Polish & Cross-Cutting Concerns

- [X] T009 [P] Run `npm run lint`.
- [X] T010 [P] Run `npx tsc -b`.
- [X] T011 Run `npm test` (full suite).
- [X] T012 Run `npm run build`.
- [X] T013 Bump `package.json` version (patch).
- [X] T014 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).

## Dependencies & Execution Order

- Setup (T001) has no dependencies.
- T002-T006 are independent (different files/components) — all `[P]`. T003 depends conceptually on
  T002's new value (64) but is a separate file, so listed sequentially for clarity, not blocked.
- T007-T008 depend on T002-T006 being complete.
- Polish depends on everything above.
