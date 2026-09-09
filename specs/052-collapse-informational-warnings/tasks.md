# Tasks: Collapse Informational Warnings in the Today Card, With a Drill-Down

## Phase 1: Setup
- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npm run build` pass.

## Phase 2: Implementation
- [X] T002 In `src/components/TodaySummaryCard.tsx`, add `const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())` and a `toggleExpanded(id)` helper that adds/removes an id from that set (new `Set` each time, not mutated in place).
- [X] T003 In `src/components/TodaySummaryCard.tsx`, replace each informational warning's `<p><strong>{title}:</strong> {description}</p>` with a `<button>` showing just the title, `aria-expanded={expandedIds.has(warning.id)}`, `onClick={() => toggleExpanded(warning.id)}`; render the description in a separate element directly after, only when expanded.
- [X] T004 In `src/index.css`, add a `.today-summary-notice-toggle` rule (button reset: no background/border, inherit font, cursor pointer, full width text-left) alongside the existing `.today-summary-notice` text styling.
- [X] T005 [P] In `tests/integration/weatherIconOverview.test.tsx`'s informational-warning test, extend/add assertions: the title is shown but the description is not, by default; clicking the title reveals the description; clicking again hides it.
- [X] T006 [P] In the same test file, add a test: two active informational warnings expand/collapse independently (expanding one doesn't reveal or hide the other's description).

## Phase 3: Polish
- [X] T007 [P] Run `npm run lint`.
- [X] T008 [P] Run `npx tsc -b`.
- [X] T009 Run `npm test` (full suite).
- [X] T010 Run `npm run build`.
- [X] T011 Bump `package.json` version (patch).
- [X] T012 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).
