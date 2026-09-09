# Tasks: Fix "Now" Marker Hidden Behind the Sticky Timeline Band

## Phase 1: Setup
- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npm run build` pass.

## Phase 2: Implementation
- [X] T002 In `src/index.css`, change `.weather-timeline-now`'s `z-index: 1;` to `z-index: 3;` (above `.weather-timeline-sections`'s `z-index: 2`).
- [X] T003 In `src/index.css`, add `z-index: 3;` to `.weather-timeline-now-label` explicitly.
- [X] T004 [P] Manually verify (via `npm run dev`, a location with both observed and forecast data) that the "Now" label is visible above the sticky band, both before and after scrolling down through the timeline's rows.

## Phase 3: Polish
- [X] T005 [P] Run `npm run lint`.
- [X] T006 [P] Run `npx tsc -b`.
- [X] T007 Run `npm test` (full suite — confirms no existing test broke; this is a visual-only fix with no new automated coverage, since z-index/paint order isn't observable via jsdom).
- [X] T008 Run `npm run build`.
- [X] T009 Bump `package.json` version (patch).
- [X] T010 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).
