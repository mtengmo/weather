# Tasks: Daytime-Weighted Daily Forecast & Manual Language Setting

**Input**: Design documents from `specs/066-daily-forecast-language-setting/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included, per this project's established convention.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npx tsc -b` pass before starting.

**Checkpoint**: No shared foundational work is needed — US1 and US2 touch entirely disjoint files
(only `src/models/types.ts` is shared, and each story adds independent fields/types to it), so
both can proceed directly after Setup.

---

## Phase 2: User Story 1 - Daily forecast reflects the day, not just its worst hour (Priority: P1) 🎯 MVP

**Goal**: The 7-day forecast strip's per-day condition/icon is driven by that day's daytime hours
(6 AM–8 PM local), not by an overnight blip that happens to dominate the whole-bucket aggregate.

**Independent Test**: Construct a forecast day with rain confined to before 6 AM or after 8 PM and
dry the rest of the day; confirm the weekly strip shows a dry condition/icon for that day instead
of rain.

### Tests for User Story 1

- [X] T002 [P] [US1] Add unit tests to `tests/unit/dailyAggregation.test.ts`: a bucket with
      precipitation/chance-of-rain only outside 6 AM–8 PM produces `daytimeTotalPrecipitation`/
      `daytimeChanceOfRainMax` of `null` (or 0, per the existing `aggregateBucket` null-when-empty
      convention) while the existing whole-bucket fields still reflect it; a bucket with
      precipitation inside that window produces non-null `daytime*` values matching it; a bucket
      with zero observations in `[6, 20)` at all leaves every `daytime*` field `null` (research.md
      §4's fallback trigger condition).
- [X] T003 [P] [US1] Add integration test assertions to `tests/integration/weatherIconOverview.test.tsx`
      (where `WeeklyForecastStrip` is already exercised): a mocked forecast day with rain only
      before 6 AM/after 8 PM renders that day's card with a dry icon/condition class; a day with
      any rain between 6 AM and 8 PM still renders a rain icon/condition class.

### Implementation for User Story 1

- [X] T004 [US1] In `src/models/types.ts`, add the five new optional `DailyAggregate` fields
      (`daytimeAverage`, `daytimeTotalPrecipitation`, `daytimeWindAverage`, `daytimeCloudAverage`,
      `daytimeChanceOfRainMax`) per data-model.md, with a doc comment explaining they're
      daytime-hour-only counterparts used solely for whole-day condition derivation.
- [X] T005 [US1] In `src/services/dailyAggregation.ts`, add a local-hour daytime filter (hour in
      `[6, 20)`, matching `isNight`'s boundary in `src/services/weatherCondition.ts`) and compute
      the five new fields inside `toDailyAggregates` by calling the existing `aggregateBucket()` on
      each bucket's daytime-filtered observation subset (research.md §2/§3) — additive only; every
      existing field/behavior of `toDailyAggregates` and `toSubDayBuckets` is unchanged.
- [X] T006 [US1] In `src/components/WeeklyForecastStrip.tsx`, switch the `deriveWeatherCondition`
      call to use the new `daytime*` fields (`daytimeAverage`, `daytimeTotalPrecipitation`,
      `daytimeWindAverage`, `daytimeCloudAverage`, `daytimeChanceOfRainMax`) instead of their
      whole-bucket counterparts, falling back to the whole-bucket fields when every `daytime*`
      field on that day is `null` (research.md §4 — a day must never end up with no computable
      condition). The icon's temperature-band input (`resolveConditionIconFromCondition`'s 4th
      argument) and the displayed high/low text continue to use the existing whole-day `average`/
      `high`/`low` fields, unchanged.

**Checkpoint**: User Story 1 is fully functional and independently testable/verifiable via
quickstart.md's US1 steps.

---

## Phase 3: User Story 2 - Manually choose English or Swedish (Priority: P2)

**Goal**: A language control in Settings lets the user force English or Swedish (or leave it on
Automatic, today's browser-detected behavior), persisted across sessions.

**Independent Test**: Open Settings, switch the language control to Swedish, confirm all app text
switches immediately with no reload; switch to English, confirm it reverts; reload the app and
confirm the last explicit choice persists.

### Tests for User Story 2

- [X] T007 [P] [US2] Create `tests/unit/language.test.ts`: `getLanguagePreference`/
      `setLanguagePreference` round-trip each of `"auto"`/`"en"`/`"sv"` through localStorage;
      an invalid/corrupted stored value falls back to `DEFAULT_LANGUAGE_PREFERENCE` (`"auto"`);
      localStorage being unavailable doesn't throw (mirrors `theme.test.ts`'s existing pattern).
- [X] T008 [US2] Create `tests/integration/languageSetting.test.tsx`: opening Settings and
      selecting "Svenska" immediately renders known Swedish text (e.g. the Settings button's own
      label, or a Today-card label) with no reload; selecting "English" reverts it; unmounting and
      re-rendering (simulating a reload) after selecting a language keeps that language rather than
      re-detecting the browser's; leaving the preference untouched (default "Automatic") behaves
      exactly as 064-swedish-translation's own `swedishTranslation.test.tsx` already verifies.

### Implementation for User Story 2

- [X] T009 [P] [US2] In `src/models/types.ts`, add `export type LanguagePreference = "auto" | "en" | "sv";`
      and `export const DEFAULT_LANGUAGE_PREFERENCE: LanguagePreference = "auto";` per data-model.md.
- [X] T010 [US2] Create `src/services/language.ts` with `getLanguagePreference()`/
      `setLanguagePreference()`, mirroring `src/services/theme.ts`'s shape exactly (localStorage
      key `"weather-app:language-preference:v1"`, a `VALID_LANGUAGE_PREFERENCES` guard array,
      try/catch around every localStorage access).
- [X] T011 [US2] Create `src/hooks/useLanguagePreference.ts`, mirroring
      `src/hooks/useThemePreference.ts`'s shape: on mount and on every explicit `setLanguage` call,
      resolve the stored preference to a concrete i18next language (`detectLanguage()` from
      `src/i18n/index.ts` when the preference is `"auto"`, otherwise the preference itself) and
      call `i18n.changeLanguage(...)` (research.md §6); persists via `setLanguagePreference`.
- [X] T012 [P] [US2] Add `settingsMenu.language`, `languageToggle.ariaLabel`,
      `languageToggle.auto`, `languageToggle.english`, `languageToggle.swedish` keys to both
      `src/i18n/en.ts` and `src/i18n/sv.ts`.
- [X] T013 [US2] Create `src/components/LanguageToggle.tsx`: a labeled `<select>` (props: current
      `LanguagePreference`, `onChange`) with the three translated options from T012, following
      `UnitToggle.tsx`'s existing control shape/conventions.
- [X] T014 [US2] Wire it up: add `language`/`onLanguageChange` props to
      `src/components/SettingsMenu.tsx` (rendering `LanguageToggle` alongside the existing
      `UnitToggle`/`HighLowToggle`), and in `src/App.tsx` call `useLanguagePreference()` and pass
      its `language`/`setLanguage` through to `SettingsMenu`.

**Checkpoint**: User Stories 1 and 2 both work independently; neither depends on the other.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T015 [P] Run `npm run lint`.
- [X] T016 [P] Run `npx tsc -b`.
- [X] T017 Run `npm test` (full suite).
- [X] T018 Run `npm run build`.
- [X] T019 Bump `package.json` version (patch — two small, independent, additive changes).
- [X] T020 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).

---

## Dependencies & Execution Order

- Setup (T001) has no dependencies.
- US1 (T002-T006) and US2 (T007-T014) are fully independent of each other — no shared runtime
  code, only both touching (different parts of) `src/models/types.ts`.
- Within US1: T002-T003 (tests) before T004-T006 (implementation); T004 before T005 before T006
  (each depends on the previous step's types/data existing).
- Within US2: T007-T008 (tests) before T009-T014 (implementation); T009 before T010 before T011;
  T012 can run in parallel with T009-T011; T013 depends on T012 (needs the translation keys to
  exist); T014 depends on T011 and T013.
- Polish depends on both user stories being complete.

## Implementation Strategy

Both stories are small and independent — implement US1 first (it's P1 and a pure bug fix with no
UI addition), verify via quickstart.md, then implement US2. Run `npx tsc -b` after each story's
implementation tasks to catch type errors immediately. Commit once at the end (Polish phase) since
both stories together are still a small, single cohesive change-set from one user request.
