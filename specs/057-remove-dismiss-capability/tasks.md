# Tasks: Remove Dismiss Capability From the Warning Banner

## Phase 1: Setup
- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npm run build` pass.

## Phase 2: Implementation
- [X] T002 In `src/components/WarningBanner.tsx`, remove the `onDismiss` prop from `WarningBannerProps` and both dismiss `<button className="warning-banner-dismiss">` elements (collapsed summary and each expanded item), plus the now-stale doc comment sentence describing dismissal.
- [X] T003 In `src/App.tsx`, remove the `useWarningDismissal` import/usage, the `dismissedIds`/`dismissWarning` destructuring, the `!dismissedIds.has(w.id)` filter, and the `onDismiss={dismissWarning}` prop passed to `<WarningBanner>`.
- [X] T004 Delete `src/hooks/useWarningDismissal.ts` and `src/services/warningDismissal.ts` (fully unused after T002/T003).
- [X] T005 Delete `tests/unit/useWarningDismissal.test.ts` (tests a now-deleted hook).
- [X] T006 In `src/index.css`, remove the now-unused `.warning-banner-dismiss` and `.warning-banner-dismiss:hover` rules.
- [X] T007 [P] In `tests/integration/warningBanner.test.tsx`, remove the two dismiss-specific tests ("hides a dismissed warning immediately..." and "dismissing one warning leaves a different warning id unaffected") and add a new test: given an active warning, the banner (collapsed and expanded) contains no button matching `/dismiss/i`.

## Phase 3: Polish
- [X] T008 [P] Run `npm run lint`.
- [X] T009 [P] Run `npx tsc -b`.
- [X] T010 Run `npm test` (full suite).
- [X] T011 Run `npm run build`.
- [X] T012 Bump `package.json` version (patch).
- [X] T013 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).
