# Tasks: Night-Time Moon Variants for Sun-Depicting Icons

## Phase 1: Setup
- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npm run build` pass.

## Phase 2: Foundational
- [X] T002 Crop `docs/logos/symbols_night_ver1.png` (2×2 grid, cell 768×512) into 4 alpha-autotrimmed files under `docs/logos/symbols_night_ver1_icons/`: `01-clear-night.png`, `02-nearly-clear-night.png`, `03-variable-cloudiness-night.png`, `04-halfclear-night.png` (cells read left-to-right, top-to-bottom = codes 1,2,3,4). *(Already done this session — verify files exist.)*
- [X] T003 Copy those 4 files into `src/assets/weather-icons/`.
- [X] T004 In `src/services/weatherCondition.ts`, change `function isNight(` to `export function isNight(`.

## Phase 3: User Story 1 - A clear night shows a moon, not a sun (P1)

### Tests
- [X] T005 [P] [US1] In `tests/unit/smhiSymbolIcons.test.ts`, add tests: `resolveConditionIconFromCondition(1, "clear-night", true)` resolves to the night-variant src (distinct from the day one); the same call with `isNightNow: false` (or omitted) resolves to the existing day src; repeat for codes 2, 3, 4.
- [X] T006 [P] [US1] In the same file, add a test: `resolveConditionIconFromCondition(6, "cloudy", true)` (a code outside 1-4) resolves to its normal day icon regardless of `isNightNow` — codes 5-27 unaffected (FR-003).
- [X] T007 [P] [US1] In `tests/integration/weatherIconOverview.test.tsx`, add a test: an hourly period with `smhiSymbolCode: 1` and a nighttime timestamp (e.g. `22:00`) renders the night-variant icon's image src; the same code at a daytime timestamp renders the existing day src.

### Implementation
- [X] T008 [US1] In `src/components/smhiSymbolIcons.ts`, import the 4 new night image files and `isNight` from `weatherCondition.ts`.
- [X] T009 [US1] In `src/components/smhiSymbolIcons.ts`, add `const NIGHT_VARIANT_ICONS: Partial<Record<number, SmhiSymbolIconEntry>> = { 1: {...}, 2: {...}, 3: {...}, 4: {...} }` (same `label` text as the corresponding `SMHI_SYMBOL_ICONS` entry).
- [X] T010 [US1] In `src/components/smhiSymbolIcons.ts`, add an `isNightNow: boolean` parameter to `resolveFromParts`, and change the SMHI-code branch to `const entry = (isNightNow ? NIGHT_VARIANT_ICONS[smhiSymbolCode] : undefined) ?? SMHI_SYMBOL_ICONS[smhiSymbolCode];`.
- [X] T011 [US1] In `src/components/smhiSymbolIcons.ts`, update `resolveConditionIcon` to compute `input.timestamp !== undefined && isNight(input.timestamp)` and pass it through; update `resolveConditionIconFromCondition` to accept a third `isNightNow: boolean = false` parameter and pass it through.
- [X] T012 [US1] In `src/components/WeatherIconOverview.tsx`'s `ConditionRow`, import `isNight` from `weatherCondition.ts` and call `resolveConditionIconFromCondition(period.smhiSymbolCode, period.condition, isNight(period.key))`.

**Checkpoint**: Codes 1-4 show the moon variant at night, the sun variant by day; codes 5-27 and the fallback path unaffected.

## Phase 4: Polish
- [X] T013 [P] Run `npm run lint`.
- [X] T014 [P] Run `npx tsc -b`.
- [X] T015 Run `npm test` (full suite).
- [X] T016 Run `npm run build`.
- [X] T017 Bump `package.json` version (patch).
- [X] T018 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).
