# Tasks: Replace Weather Icons With Character Artwork

**Input**: Design documents from `specs/063-replace-weather-icons/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included, per this project's established convention (full `npm test` run required before
every commit).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Phase 1: Setup

- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npm run build` pass.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Every user story below renders through the same rewritten resolver in
`smhiSymbolIcons.ts` — this phase produces the assets and that resolver.

- [X] T002 In `docs/weathericons/sheet-manifest.json`, correct the `input_file` values to match the
      19 sheets' actual on-disk filenames (research.md §2 table — e.g. `01_kvinna_frozen.png` →
      `01_kvinna-frozen.png`, `07_par_nearzero.png` → `07_par_nerzero.png`,
      `09_par_warm.png` → `09_par_varm.png`, `17_flicka_frozen.png` → `17_flicka_fronzen.png`).
- [X] T003 Run `python split_icons.py` from `docs/weathericons/`; confirm the summary line reads
      `124/124` with no `❌` lines (quickstart.md step 1). Spot-check 2-3 output files for `RGBA`
      mode and a sensible tight crop (quickstart.md step 2).
      (Required `--sheets-dir .` since the sheets are directly in `docs/weathericons/`, not a
      `sheets/` subfolder; also required installing `scipy` into the interpreter Git Bash's
      `python3` actually resolves to, since `pip`/`python3` pointed at two different installs.)
- [X] T004 Move the 124 verified files from `docs/weathericons/icons_split/` into a new
      `src/assets/weather-icons-v2/` directory.
- [X] T005 In `src/components/smhiSymbolIcons.ts`, add: the `WeatherType` union (12 values),
      `SMHI_CODE_TO_WEATHER_TYPE` (27 entries, inverse of `sheet-manifest.json`'s `code_mapping`),
      the `IconTempBand` union (6 values), `mapTemperatureToIconBand(celsius): IconTempBand`, and
      `WEATHER_TYPE_ARTWORK` importing all 124 assets from `src/assets/weather-icons-v2/`
      (data-model.md).
      (Used `import.meta.glob` for the 124 imports rather than 124 individual named imports — the
      scale here is meaningfully larger than this codebase's usual per-file-import convention.)
- [X] T006 In `src/components/smhiSymbolIcons.ts`, add
      `resolveWeatherTypeForBand(type, band): WeatherType` implementing FR-005's fallback
      (`rain-light`/`rain-heavy` at `frozen`/`cold` → `sleet`; `snow-light`/`snow-heavy` at
      `mild`/`warm`/`hot` → `sleet`), matching `sheet-manifest.json`'s own `fallback` rule exactly.
- [X] T007 In `src/components/smhiSymbolIcons.ts`, rewrite `resolveFromParts`'s `smhi-symbol`
      branch: resolve a code (real `smhiSymbolCode`, or `CONDITION_SMHI_FALLBACK`'s best-fit code
      when absent or unrecognized — `windy` still has no entry there and keeps the lucide path
      unchanged, research.md §5), map it through `SMHI_CODE_TO_WEATHER_TYPE`, map the
      (now-parameterized) temperature through `mapTemperatureToIconBand` (defaulting to
      `"nearzero"` when temperature is `null`, FR-006), apply `resolveWeatherTypeForBand`, and
      look up the day/night `src` from `WEATHER_TYPE_ARTWORK` — keep the existing `label`
      resolution untouched (research.md §4). Delete `NIGHT_VARIANT_ICONS` and the old per-code
      `SMHI_SYMBOL_ICONS` image table (research.md §6) — no longer referenced once this branch is
      rewritten.
      (Fixed a bug found via testing: an out-of-range/unrecognized `smhiSymbolCode` must fall
      through to the `CONDITION_SMHI_FALLBACK` path, not silently fail — the initial `if
      (smhiSymbolCode != null)` branch needed to also check the code resolves to a known label.)
- [X] T008 In `src/components/smhiSymbolIcons.ts`, add a `temperatureCelsius: number | null`
      parameter to `resolveConditionIconFromCondition`'s signature, threading it into T007's
      rewritten resolution.
- [X] T009 In `src/components/smhiSymbolIcons.ts`, update `resolveConditionIcon` to read
      `input.temperature` and pass it into the same rewritten resolution — no change to its own
      external signature (research.md §7).

**Checkpoint**: The resolver produces the new artwork for any code/condition + temperature +
day-or-night combination. User story phases below wire up each remaining call site and add
coverage.

---

## Phase 3: User Story 1 - See a character-illustrated weather icon everywhere the app shows one (Priority: P1) 🎯 MVP

**Goal**: Every one of the four existing icon placements (Today card, hourly timeline, Details
table, 7-day forecast strip) renders the new character artwork instead of its current icon.

**Independent Test**: Render each of the four placements for a location/time with a known weather
code and temperature; confirm all four show the same new artwork for the same
code/temperature/day-or-night combination.

### Implementation for User Story 1

- [X] T010 [US1] In `src/components/timelineData.ts`, add `temperature: number | null` to the
      `TimelinePeriod` interface (data-model.md) and populate it in both `buildHourlyTimelineData`
      (from `obs.temperature`) and `daysToTimelineData` (from `day.average`) — the same place each
      already sets `condition`/`smhiSymbolCode` for that period.
- [X] T011 [US1] In `src/components/WeatherIconOverview.tsx`'s `ConditionRow`, pass
      `period.temperature` as the new argument to `resolveConditionIconFromCondition`.
- [X] T012 [P] [US1] In `src/components/TodaySummaryCard.tsx`, replace the direct
      `WEATHER_ICONS[condition]` lookup with a call to `resolveConditionIconFromCondition`
      (`undefined` code, the card's existing `condition`, `isNight(new Date().toISOString())`, and
      its existing `currentTemperature`-with-high/low-midpoint-fallback value already established
      by 061-cartoon-weather-companion); render `<img>` vs `<iconInfo.Icon>` based on
      `iconInfo.kind`, mirroring `WeatherIconOverview.tsx`'s existing branch (research.md §1, §7).
- [X] T013 [P] [US1] In `src/components/WeeklyForecastStrip.tsx`, the same migration: call
      `resolveConditionIconFromCondition(undefined, condition, false, day.average)` and branch the
      render on `iconInfo.kind` the same way.
- [X] T014 [US1] Rewrite `tests/unit/smhiSymbolIcons.test.ts`'s existing per-code-image assertions
      (obsolete — the old `SMHI_SYMBOL_ICONS`/`NIGHT_VARIANT_ICONS` tables no longer exist) to
      cover: every one of the 27 codes resolves through `SMHI_CODE_TO_WEATHER_TYPE` to its correct
      weather type; a representative temperature in each of the 6 bands resolves to distinct
      day/night artwork; the day/night distinction now works for every weather type, not just the
      four sun-depicting codes (research.md §6).
- [X] T015 [P] [US1] Integration test in `tests/integration/weatherIconOverview.test.tsx`: for a
      known condition/temperature, the Today card, the hourly timeline's "Weather" row, and the
      7-day forecast strip all render an `<img>` pointing at the new-artwork asset (SC-002).
      (Also fixed 3 pre-existing tests in this file that asserted the old filename patterns
      (`01-clear.png`, `05-cloudy`, etc.) — updated to the new `weather_{type}_{day|night}_{band}`
      naming.)
- [X] T016 [P] [US1] Integration test in `tests/integration/chartAndDetails.test.tsx`: the Details
      table renders the new artwork for an observation with a known `smhiSymbolCode` and
      `temperature`.

**Checkpoint**: User Story 1 is fully functional and independently testable — the new artwork
renders correctly everywhere for the common case.

---

## Phase 4: User Story 2 - Sensible fallback for combinations that don't occur in nature (Priority: P2)

**Goal**: Confirm rain-at-extreme-cold and snow-at-warm/hot both resolve to the sleet artwork for
that band, rather than a missing image.

**Independent Test**: Resolve a rain code at a `frozen`/`cold` temperature, and a snow code at a
`mild`/`warm`/`hot` temperature; confirm both yield the sleet artwork for that band.

### Tests for User Story 2

- [X] T017 [P] [US2] Unit test in `tests/unit/smhiSymbolIcons.test.ts`: `resolveWeatherTypeForBand`
      resolves `rain-light`/`rain-heavy` at `frozen`/`cold` to `sleet`, and `snow-light`/
      `snow-heavy` at `mild`/`warm`/`hot` to `sleet`, leaving every other combination unchanged
      (FR-005, matching `sheet-manifest.json`'s own fallback rule exactly).

**Checkpoint**: User Stories 1 AND 2 both verified — no implementation task needed here (delivered
by Phase 2's T006).

---

## Phase 5: User Story 3 - Icon still renders when temperature data is missing (Priority: P3)

**Goal**: Confirm a period with a known weather code but no temperature still renders artwork
(the `nearzero` default band) rather than nothing.

**Independent Test**: Resolve a known code with `temperatureCelsius: null`; confirm defined
artwork is returned, not `null`.

### Tests for User Story 3

- [X] T018 [P] [US3] Unit test in `tests/unit/smhiSymbolIcons.test.ts`:
      `resolveConditionIconFromCondition`/`resolveConditionIcon` with a `null` temperature still
      returns a defined `{kind: "smhi-symbol", src, label}` result (the `nearzero`-band artwork for
      that code), not `null` (FR-006).

**Checkpoint**: All three user stories verified — Phase 2's resolver rewrite is now fully covered.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 [P] Run `npm run lint`.
- [X] T020 [P] Run `npx tsc -b`.
- [X] T021 Run `npm test` (full suite) — 651/651 passing, confirming no other existing test's
      call-count or filename assertions were broken by Phase 2's rewrite.
- [X] T022 Run `npm run build`.
- [X] T023 Bump `package.json` version (patch).
- [X] T024 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories. T002→T003→T004 (assets)
  must complete before T005 (which imports them); T005→T006→T007→T008/T009 (each builds on the
  previous within the same file).
- **User Story 1 (Phase 3)**: Depends on Foundational. T010 (data model) before T011 (its
  consumer). T012/T013 are independent of T010/T011 and of each other.
- **User Story 2 (Phase 4)**: Depends on Foundational only — test-only, no new implementation.
- **User Story 3 (Phase 5)**: Depends on Foundational only — test-only, no new implementation.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### Parallel Opportunities

- T012 and T013 were `[P]` — independent components, no shared file.
- T014 was `[P]` with T015/T016 — different files.
- All of Phase 4's and Phase 5's tests (T017, T018) are `[P]` with each other and with Phase 3's
  tests — independent assertions in the same file, no shared mutable state.

---

## Implementation Notes (discovered during implementation)

- The new artwork files are considerably larger than the old SMHI icon set (~31 MB total across
  124 files vs. a few MB before) — each character illustration is much more detailed than the old
  flat SMHI symbols. This doesn't violate any requirement (SC-003 is about request count, not
  payload size, and these load as normal `<img>` requests exactly like the old icons did — never
  part of the service worker's precache), but it's worth flagging as a follow-up candidate
  (image compression/resizing) if load time on slow connections becomes a concern.

## Implementation Strategy

### MVP First (Foundational + User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational — assets generated, resolver rewritten.
3. Complete Phase 3: User Story 1 — all four placements wired up.
4. **STOP and VALIDATE**: `npm run dev`, confirm the new artwork appears everywhere per
   quickstart.md step 4.

### Incremental Delivery

1. Setup + Foundational → assets and resolver ready.
2. Add User Story 1 → all four placements show the new artwork → validate visually.
3. Add User Story 2 → sleet-fallback correctness proven by tests (no visible behavior change from
   Phase 2, since the fallback was already implemented there — this closes the coverage gap).
4. Add User Story 3 → missing-temperature fallback proven by tests (same — no new implementation).
5. Polish → lint/typecheck/full test suite/build/version bump/commit.
