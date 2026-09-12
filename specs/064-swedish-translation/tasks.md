# Tasks: Swedish Translation Based On Browser Language

**Input**: Design documents from `specs/064-swedish-translation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included, per this project's established convention.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npm run build` pass.
- [X] T002 `npm install i18next react-i18next` (research.md §1).

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Every component migration below depends on the i18n setup existing first.

- [X] T003 Create `src/i18n/en.ts` and `src/i18n/sv.ts`, each exporting an empty
      `Record<string, string>` typed as `TranslationResource` (data-model.md) — populated
      incrementally as each component below is migrated.
- [X] T004 Create `src/i18n/index.ts`: `i18next.init()` with the `en`/`sv` resources, `lng`
      resolved via the one-line detection rule (`navigator.language`/`navigator.languages[0]`
      starts with `"sv"` → `"sv"`, else `"en"`; research.md §2), `fallbackLng: "en"`.
- [X] T005 In `src/main.tsx`, import `"./i18n"` before rendering `<App />`.
- [X] T006 Create `tests/unit/i18n.test.ts`: `en.ts`/`sv.ts` have identical key sets, no key
      resolves to an empty string (data-model.md's validation rules).

**Checkpoint**: i18n infrastructure exists and is verified — component migrations can begin.

---

## Phase 3: User Story 1 + User Story 2 - Swedish auto-detected, everyone else unaffected (Priority: P1) 🎯 MVP

**Goal**: Every user-facing string across the app is translation-aware; a Swedish browser sees
100% Swedish, everything else sees today's unchanged English.

**Independent Test**: Set a browser's language to Swedish, confirm every screen is in Swedish; set
it to English (or anything else), confirm no visible change from today.

Migration order follows research.md §6 (highest-visibility first). Each task adds that
component's strings to both `en.ts` and `sv.ts` (English values copied verbatim from today's
existing text — the baseline every Swedish value is checked against) and replaces the component's
hardcoded strings with `useTranslation()` + `t("key")` calls. Numeric/date/time formatting
(`Intl`/`toLocale*` calls, the intentionally-fixed 24-hour hour format) is left untouched (FR-006).

- [X] T007 [US1] Migrate `src/App.tsx` (header controls, view-switcher buttons, error banner).
- [X] T008 [US1] Migrate `src/components/TodaySummaryCard.tsx`.
- [X] T009 [US1] Migrate `src/components/WeatherIconOverview.tsx` (largest file — timeline row
      labels, window-toggle buttons, informational-warning UI, UV badge, etc.).
- [X] T010 [P] [US1] Migrate `src/components/LocationPanel.tsx`.
- [X] T011 [P] [US1] Migrate `src/components/LocationSwitcher.tsx`.
- [X] T012 [P] [US1] Migrate `src/components/PlaceSearch.tsx`.
- [X] T013 [P] [US1] Migrate `src/components/FavoritesList.tsx`.
- [X] T014 [P] [US1] Migrate `src/components/SettingsMenu.tsx`.
- [X] T015 [P] [US1] Migrate `src/components/ThemeToggle.tsx`.
- [X] T016 [P] [US1] Migrate `src/components/UnitToggle.tsx`.
- [X] T017 [P] [US1] Migrate `src/components/HighLowToggle.tsx`.
- [X] T018 [P] [US1] Migrate `src/components/NearbyStationCountControl.tsx`.
- [X] T019 [P] [US1] Migrate `src/components/MetricTabs.tsx`.
- [X] T020 [US1] Migrate `src/components/ObservationChart.tsx`.
- [X] T021 [US1] Migrate `src/components/ObservationDetails.tsx`.
- [X] T022 [P] [US1] Migrate `src/components/WeeklyForecastStrip.tsx`.
- [X] T023 [P] [US1] Migrate `src/components/WarningBanner.tsx`.
- [X] T024 [P] [US1] Migrate `src/components/MapView.tsx`.
- [X] T025 [P] [US1] Migrate `src/components/Footer.tsx`.
- [X] T026 [P] [US1] Migrate `src/components/DebugPanel.tsx`.
- [X] T027 [P] [US1] Migrate `src/components/weatherIcons.tsx` (the 12 condition labels — also
      consumed by `smhiSymbolIcons.ts`'s resolvers, so these labels must keep exactly the same
      *English* value as today; only add a Swedish counterpart).
- [X] T028 [US1] Migrate `src/components/HowItWorks.tsx` (long-form prose).
- [X] T029 [US1] Migrate `src/components/PrivacyNotice.tsx` (long-form prose).
- [X] T030 [US1] Migrate `src/services/format.ts`, using interpolated keys for the
      brand-name-mixed sentences ("Data: {{source}}", etc. — research.md §4); since this is a
      plain function (not a component), it takes `i18next.t` directly (imported from `i18next`,
      not the `useTranslation()` hook) since there's no React tree to hook into here.
- [X] T031 [US1] Sweep `src/components/smhiSymbolIcons.ts` for any remaining hardcoded label
      strings not already covered by T027's `weatherIcons.tsx` labels (e.g. the 27
      `SMHI_SYMBOL_LABELS` entries) and migrate them the same way.
- [X] T032 [US1] Full-app sweep: `grep` for remaining bare English string literals in JSX across
      `src/` to catch anything the file-by-file pass missed (SC-001 — 100% coverage, not "most of
      it").
- [X] T033 [US1] Integration test in `tests/integration/appHeader.test.tsx` (or a new file):
      mocking `navigator.language` as `"sv-SE"` renders a representative sample of Swedish text
      (header button, Today card label, a warning message) instead of English.
- [X] T034 [US1] Integration test: mocking `navigator.language` as `"en-US"` (and separately, an
      unrelated language like `"fr-FR"`) renders English, unchanged from today (US2/SC-002).

**Checkpoint**: Full Swedish coverage achieved and verified; non-Swedish behavior unchanged.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T035 [P] Run `npm run lint`.
- [X] T036 [P] Run `npx tsc -b`.
- [X] T037 Run `npm test` (full suite) — existing tests that assert specific English text will
      need their `navigator.language`/locale left at the default (English) test environment, or
      updated if any now need an explicit language stub.
- [X] T038 Run `npm run build`.
- [X] T039 Bump `package.json` version (minor, given the scope).
- [X] T040 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).

---

## Dependencies & Execution Order

- Setup (T001-T002) has no dependencies.
- Foundational (T003-T006) depends on Setup — BLOCKS every component migration task.
- T007-T031 depend on Foundational; most are independent per-file edits (marked `[P]`) — a few
  (T007-T009, T020-T021, T028-T030) are listed sequentially because they're the largest/most
  central files, safest done without parallel distraction, not because of a real file conflict.
- T032 (sweep) depends on all of T007-T031 being done.
- T033-T034 depend on T032.
- Polish depends on everything above.

## Implementation Strategy

Given the size (23 component-migration tasks), work through them in the listed order, verifying
`npx tsc -b` stays clean after each file (a missed `t()` import or a typo'd key is caught
immediately rather than compounding). Commit once at the end of Phase 3 (T032) rather than after
every single file — this is one cohesive feature, not 23 independent shippable increments, since
SC-001 requires full coverage before the feature is actually done.
