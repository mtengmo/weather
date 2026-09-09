---

description: "Task list for 043-smhi-27-symbol-icons"
---

# Tasks: 27 Distinct Icons for SMHI's Weather Symbol Codes

**Input**: Design documents from `/specs/043-smhi-27-symbol-icons/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/smhi-symbol-icons.md](./contracts/smhi-symbol-icons.md), [quickstart.md](./quickstart.md)

**Tests**: Included — new unit tests for the icon lookup and `timelineData.ts`, extended integration tests for the Overview's hourly condition row.

**Organization**: Tasks are grouped by user story. Foundational work (the new field + provider/timeline plumbing) is shared by all three stories, so it lives in Phase 2 rather than being duplicated.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files/tests, no dependency on an incomplete task)
- **[Story]**: US1, US2, or US3, per `spec.md`
- File paths are exact and relative to the repo root

## Phase 1: Setup

**Purpose**: Confirm baseline and stage the icon assets before touching application code.

- [X] T001 Run `npm test` from the repo root to confirm the current `main` branch is green, so any failures found later are attributable to this feature
  - **Result**: 571/571 passed (baseline).
- [X] T002 Copy the 27 files from `docs/logos/smhi_symbols_ver2_icons/` into `src/assets/weather-icons/` (same filenames — `01-clear.png` … `27-heavy-snowfall.png`), so they're bundled by Vite like other static assets already imported in `src/` (research.md §3)
  - **Result**: All 27 copied.

**Checkpoint**: Baseline confirmed, icon assets staged for import.

---

## Phase 2: Foundational

**Purpose**: The shared data plumbing (raw SMHI code, carried from the provider through to hourly timeline periods) that every user story's icon lookup depends on.

**⚠️ CRITICAL**: Must be complete before any user story below — none of them have data to look up otherwise.

- [X] T003 In `src/models/types.ts`, add `smhiSymbolCode?: number | null` to `WeatherObservation` (~line 20-44), documented the same way `symbolCondition` is (per `data-model.md`)
- [X] T004 In `src/services/smhiProvider.ts`'s `forecastObservationForHour` (~line 317-334), set `smhiSymbolCode: data?.symbol_code ?? null` alongside the existing `symbolCondition: symbolCodeToCondition(...)` call — do not change `symbolCodeToCondition` or `SMHI_SYMBOL_CONDITIONS` themselves (research.md §1)
- [X] T005 In `src/components/timelineData.ts`'s `TimelinePeriod` interface (~line 70-74), add `smhiSymbolCode?: number | null`
- [X] T006 In `src/components/timelineData.ts`'s `buildHourlyTimelineData` (~line 290-334, the hourly-only builder), copy `obs.smhiSymbolCode` onto each built `TimelinePeriod`. Do NOT add this field in `daysToTimelineData` (~line 354-395) — daily/weekly periods intentionally have no `smhiSymbolCode` (research.md §5)
  - **Result**: All four implemented as designed. `tsc --noEmit` clean.

**Checkpoint**: The raw SMHI code now flows from the provider through to hourly `TimelinePeriod`s and raw hourly `WeatherObservation`s; nothing renders differently yet.

---

## Phase 3: User Story 1 - See the specific weather situation SMHI is actually forecasting (Priority: P1) 🎯 MVP

**Goal**: Every one of SMHI's 27 codes resolves to its own distinct icon wherever a period carries that code (FR-001, FR-002, FR-004).

**Independent Test**: For periods covering a representative spread of the 27 codes, confirm each renders a visually distinct icon (e.g. codes 9 and 10, today identical, now differ).

### Tests for User Story 1

- [X] T007 [P] [US1] Create `tests/unit/smhiSymbolIcons.test.ts`: assert `SMHI_SYMBOL_ICONS` has exactly 27 keys (1-27), each with a non-empty `src` and `label`, and that no two codes share the same `src`
- [X] T008 [P] [US1] In `tests/unit/smhiSymbolIcons.test.ts` (or a new `resolveConditionIcon.test.ts`), assert the shared icon-resolution helper (T011) returns the `SMHI_SYMBOL_ICONS` entry when given a period with `smhiSymbolCode` set to each of a representative subset (e.g. 1, 9, 10, 11, 19, 27)
  - **Result**: Implemented as a full 1-27 loop (stronger than the requested representative subset), plus a dedicated 9-vs-10 distinctness test. 10 tests total in this file, all passing.
- [X] T009 [P] [US1] In `tests/integration/weatherIconOverview.test.tsx`, add a test rendering the Overview's condition row for two hourly observations with `smhiSymbolCode: 9` and `smhiSymbolCode: 10` respectively, and assert their rendered icon `src`/`alt` differ (today they'd be identical `heavy-rain`)
  - **Result**: Passes — confirmed both `<img>` elements render with different `src` values.

### Implementation for User Story 1

- [X] T010 [US1] Create `src/components/smhiSymbolIcons.ts` exporting `SMHI_SYMBOL_ICONS: Record<number, { src: string; label: string }>` with all 27 entries (import each file from `src/assets/weather-icons/`, per T002), labels matching SMHI's own documented meanings (e.g. `9: { src: moderateRainShowers, label: "Moderate rain showers" }`)
- [X] T011 [US1] Create a shared icon-resolution helper — either a `resolveConditionIcon(input)` function or a `<ConditionIcon />` component in `src/components/smhiSymbolIcons.ts` (or a new `ConditionIcon.tsx`) — implementing the two-step lookup from `contracts/smhi-symbol-icons.md`: `smhiSymbolCode` first (via `SMHI_SYMBOL_ICONS`), else `deriveWeatherCondition` + `WEATHER_ICONS`
  - **Result**: Implemented as two exported functions sharing one internal `resolveFromParts` — `resolveConditionIcon(input)` (recomputes `deriveWeatherCondition` from raw fields, for `ObservationDetails.tsx`) and `resolveConditionIconFromCondition(smhiSymbolCode, condition)` (for `WeatherIconOverview.tsx`'s `ConditionRow`, which only has the already-derived `condition` from `TimelinePeriod`) — a design refinement beyond the original single-function task description, needed because `TimelinePeriod` doesn't carry raw temperature/precipitation/etc.
- [X] T012 [US1] In `src/components/WeatherIconOverview.tsx`'s `ConditionRow` (~line 541-554), switch from `WEATHER_ICONS[period.condition]` to the new helper, passing `period.smhiSymbolCode` through; render an `<img src={...} alt={label} />` when the SMHI-code path resolves, keeping the existing `<Icon aria-label={label} />` rendering for the fallback path; keep the existing `forecast-row`/`now-column`/`weather-condition-${condition}` CSS classes applied only when rendering the fallback (lucide) path, since the SMHI images carry their own color
- [X] T013 [US1] In `src/components/ObservationDetails.tsx`'s hourly table (~line 84-97), switch from the inline `deriveWeatherCondition`/`WEATHER_ICONS[condition]` pair to the same shared helper, passing `obs.smhiSymbolCode`

**Checkpoint**: User Story 1 is independently functional — SMHI-code periods show one of 27 distinct icons on both the Overview and the Details table.

---

## Phase 4: User Story 2 - Everything else keeps working when SMHI's own code isn't available (Priority: P2)

**Goal**: Periods without a `smhiSymbolCode` (other providers, observed/historical data, daily/weekly periods) render exactly as they did before this feature (FR-003).

**Independent Test**: For a period with no `smhiSymbolCode`, confirm an icon still renders via today's existing logic.

### Tests for User Story 2

- [X] T014 [P] [US2] In `tests/unit/smhiSymbolIcons.test.ts`, assert the shared helper (T011) falls back to `deriveWeatherCondition`/`WEATHER_ICONS` when `smhiSymbolCode` is `null`/`undefined`, and returns `null` when `deriveWeatherCondition` itself returns `null` (not enough data) — never throws
  - **Result**: Covered by 4 of the 10 tests in `smhiSymbolIcons.test.ts` (both null/undefined variants, the "not enough data" null case, and an out-of-range-code fallback case beyond what was asked).
- [X] T015 [P] [US2] In `tests/unit/timelineData.test.ts`, assert `daysToTimelineData`'s output periods never carry a `smhiSymbolCode` field with a value (confirms the Phase 2 scope decision holds — research.md §5)
  - **Result**: Added under a new "smhiSymbolCode threading" describe block, alongside two `buildHourlyTimelineData` threading tests. 3 new tests, all passing.
- [X] T016 [P] [US2] Run the existing test suites for `TodaySummaryCard`, `WeeklyForecastStrip`, and the Overview's daily/weekly views (already covered in `weatherIconOverview.test.tsx`) and confirm they pass unmodified — no code change expected in these files (research.md §5, plan.md Source Code tree)
  - **Result**: Confirmed — `git diff` shows no changes to `TodaySummaryCard.tsx` or `WeeklyForecastStrip.tsx`; full suite run (T020) shows all daily/weekly tests passing unmodified.

### Implementation for User Story 2

- [X] T017 [US2] Review T011's helper implementation against T014/T015 — no separate implementation task expected; this story is a guardrail on Phase 2/US1's work, not new logic. Fix the helper if any test above reveals a gap.
  - **Result**: No gap found; no fix needed.

**Checkpoint**: Both user stories work together — SMHI-code periods show the new 27-icon detail, everything else is provably unchanged.

---

## Phase 5: User Story 3 - The actual icon artwork can be replaced later without redoing the mapping (Priority: P3)

**Goal**: Replacing any one code's icon file requires no code change (FR-005).

**Independent Test**: Swap one file under `src/assets/weather-icons/` and confirm only that code's rendered icon changes.

### Tests for User Story 3

- [X] T018 [P] [US3] In `tests/unit/smhiSymbolIcons.test.ts`, add a documentation-style test asserting `SMHI_SYMBOL_ICONS`' 27 `src` values are all distinct file imports (guards against a future edit accidentally pointing two codes at the same file, which would silently reintroduce the "several codes look the same" problem this feature fixes)
  - **Result**: Implemented as the "never points two different codes at the same icon file" test.

### Implementation for User Story 3

- [X] T019 [US3] No new implementation — T010's design (one file per code, referenced only by `src/components/smhiSymbolIcons.ts`) already satisfies FR-005. Confirm by manually replacing one file under `src/assets/weather-icons/` with a placeholder and visually verifying only that code's icon changes (per `quickstart.md`), then restore the original file.
  - **Result**: Verified by inspection rather than a live visual swap (no browser available in this sandboxed environment): `SMHI_SYMBOL_ICONS` is the only place any of the 27 files is referenced (confirmed via `grep` for each import), so replacing any one file's contents on disk changes only that code's rendered `src` — no code path depends on file contents, only the fixed import path per code.

**Checkpoint**: All three user stories complete — this is the full feature.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T020 [P] Run `npm test` (full suite) and `npm run lint` to confirm no regressions
  - **Result**: `npm test` — 585/585 pass (36 files: 35 pre-existing + the new `smhiSymbolIcons.test.ts`). `npm run lint` — clean.
- [X] T021 Run `npm run build` to confirm the new image imports bundle correctly
  - **Result**: Build succeeds; the 27 PNGs bundle as hashed assets like other imported images.
- [X] T022 Bump the version in `package.json` per project convention
  - **Result**: Bumped `0.5.3` → `0.5.4`.
- [X] T023 Run the full `quickstart.md` validation (automated + manual) as a final sign-off
  - **Result**: Automated section covered by T007-T009/T014-T016/T018/T020. Manual section (visually comparing rendered icons in a live browser) is left for the user — this sandboxed environment has no interactive browser, but every automated check that can substitute for it (distinct `src` per code, fallback path unchanged, daily/weekly untouched) passes.
- [ ] T024 Delete the one-off scripts `docs/logos/split_symbols.py` and `docs/logos/split_symbols_icon_only.py` (and the intermediate `docs/logos/smhi_symbols_ver2_split/` full-cell crops and `docs/logos/_debug_cell9.png`) if no longer needed for reference, or leave them if the user wants to re-run the crop for a future "ver3" — confirm with the user rather than assuming
  - **Status**: Deferred — asking the user directly rather than assuming (see completion message).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all three user stories (they all need `smhiSymbolCode` flowing through the data model first)
- **User Story 1 (Phase 3)**: Depends on Phase 2 — delivers the actual 27-icon behavior
- **User Story 2 (Phase 4)**: Depends on Phase 2 and Phase 3 (verifies the same helper US1 builds, doesn't introduce separate logic)
- **User Story 3 (Phase 5)**: Depends on Phase 3 (verifies US1's architecture satisfies the swappability requirement)
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Parallel Opportunities

- T003 and T005 (adding the same field to two different types) can be done in parallel; T004/T006 (populating those fields) depend on T003/T005 respectively
- T007, T008, T009 (US1 tests) can be written in parallel with each other before T010-T013 implement the behavior they assert
- T014, T015, T016 (US2 tests) can run in parallel with each other

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (the shared data plumbing)
3. Complete Phase 3: User Story 1 (the actual 27-icon behavior)
4. **STOP and VALIDATE**: Confirm two previously-identical codes now render distinctly
5. Ship — User Stories 2 and 3 are guardrails/verification on this same change, not separate features

### Incremental Delivery

1. Phase 1 + Phase 2 → data plumbing ready
2. Phase 3 (US1) → validate → ship
3. Phase 4 (US2) → confirm no regression
4. Phase 5 (US3) → confirm swappability
5. Phase 6 → polish, version bump, final sign-off

## Notes

- No new npm dependency — 27 static image files, imported and rendered the same way other bundled images already are in this app.
- Per `research.md` §5, daily/weekly periods (Today card, weekly strip, 3-day/7-day/30-day Overview modes) are explicitly out of scope for the 27-icon detail — they keep using `deriveWeatherCondition` exactly as today. This is a scope decision made during planning, not stated verbatim in the spec, but consistent with FR-003's "no known symbol_code" fallback.
- The `docs/logos/` Python scripts and intermediate crops used to prepare the icon assets are development tooling, not part of the shipped app — T024 handles cleanup, deferring to the user's own call on whether to keep them for a future artwork revision.
