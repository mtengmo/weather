# Tasks: Fix Night Moon Icon Appearing on Whole-Day Columns

## Phase 1: Setup
- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npm run build` pass.

## Phase 2: Implementation
- [X] T002 In `src/components/smhiSymbolIcons.ts`'s `resolveFromParts`, change the fallback branch's night check from the passed-in `isNightNow` to `condition === "clear-night"` — i.e. `const useNightVariant = condition === "clear-night"; const entry = (useNightVariant ? NIGHT_VARIANT_ICONS[fallbackCode] : undefined) ?? SMHI_SYMBOL_ICONS[fallbackCode];`. Leave the SMHI-code branch (`isNightNow`-driven) unchanged.
- [X] T003 [P] In `tests/unit/smhiSymbolIcons.test.ts`, add a regression test: `resolveConditionIconFromCondition(null, "clear-day", true)` (simulating a whole-day column, condition always `"clear-day"`, but `isNightNow` spuriously `true` because the page happened to load at night) resolves to the day sun icon, not the night moon one.
- [X] T004 [P] In the same file, add a test confirming the fallback path still correctly resolves the night icon when `condition` is genuinely `"clear-night"` (regardless of `isNightNow`'s value), and the day icon when `condition` is `"clear-day"` and `isNightNow` is `false`.

## Phase 3: Polish
- [X] T005 [P] Run `npm run lint`.
- [X] T006 [P] Run `npx tsc -b`.
- [X] T007 Run `npm test` (full suite).
- [X] T008 Run `npm run build`.
- [X] T009 Bump `package.json` version (patch).
- [X] T010 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).
