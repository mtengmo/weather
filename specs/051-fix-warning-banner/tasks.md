# Tasks: Fix Warning Banner Colors to Match Real Severity

## Phase 1: Setup
- [X] T001 Confirm `npm test`/`npm run lint`/`npm run build` pass on `main` as a baseline.

## Phase 2: Implementation
- [X] T002 In `src/services/weatherApi.ts`, update `SEVERITY_ORDER` to include `YELLOW: 1, ORANGE: 2, RED: 3` alongside the existing `MESSAGE: 0, CLASS_1: 1, CLASS_2: 2, CLASS_3: 3`.
- [X] T003 In `src/index.css`, change `.warning-banner`'s base background/border from `var(--error-bg)`/`var(--error-border)` to neutral tokens (`var(--card-bg)`/`var(--border)` or equivalent already used elsewhere), and `.warning-banner-summary`'s text color from `var(--error-text)` to `var(--text)`.
- [X] T004 In `src/index.css`, add `.warning-level-yellow`, `.warning-level-orange`, `.warning-level-red` rules (alongside the existing `_class_1/2/3` aliases) giving each its own background tint + border-left + (where needed) text color, reusing the existing `#eab308`/`#f97316`/`#dc2626` colors.
- [X] T005 [P] In `tests/unit/weatherApi.test.ts`, add a test: warnings coded `YELLOW`, `ORANGE`, `RED` sort in that ascending severity order (Red highest).
- [X] T006 [P] In `tests/integration/warningBanner.test.tsx`, add a test: a `YELLOW`-coded warning's rendered summary element has class `warning-level-yellow`, not a red-defaulted appearance (assert the class is present; CSS itself isn't unit-testable here).

## Phase 3: Polish
- [X] T007 [P] Run `npm run lint`.
- [X] T008 [P] Run `npx tsc -b`.
- [X] T009 Run `npm test` (full suite).
- [X] T010 Run `npm run build`.
- [X] T011 Bump `package.json` version (patch).
- [X] T012 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).
