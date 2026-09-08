# Phase 0 Research: Restore Rain Percentage and Remove Sticky Row-Title Column

## 1. Where the rain-percentage display actually lives today

**Decision**: Treat `WeatherIconOverview.tsx`'s `BarRow` (the dashboard timeline's Rain row) as the single place this feature touches, specifically the `<span className="weather-timeline-bar-chance">` block rendered next to `<span className="weather-timeline-bar-value">`.

**Rationale**: A code audit of the three most recent commits (`4edb95a`, `9f24852`, `775f060`) found no diff that removes or hides `.weather-timeline-bar-chance` or the `point.chanceOfRain` plumbing that feeds it (`timelineData.ts`, `WeatherIconOverview.tsx`). The condition guarding the span (`point.chanceOfRain !== null && point.chanceOfRain !== undefined && point.chanceOfRain > 0`) and its CSS (`src/index.css`, `.weather-timeline-bar-chance`) are unchanged and pre-date this week's work (original feature: `011-precipitation-chance`).

Since the code path is intact, this is most likely a live data-availability issue rather than a deleted code path: `chanceOfRain` is only populated for providers that supply a precipitation-probability figure (Open-Meteo does; SMHI does not — see `smhiProvider.ts`/`timelineData.ts` comments). If the user's active location/source is SMHI-only for the affected periods, the percentage span was never going to render — it degrades to amount-only "gracefully" by design, which can look identical to "it disappeared" from the user's point of view. This needs to be confirmed with the user's own data during implementation (manually inspecting `chanceOfRain` values for their default location across providers) rather than assumed away.

**Alternatives considered**:
- Assume it's a pure display bug and only re-verify the JSX/CSS — rejected as insufficient given the audit found nothing removed there; the fix must include confirming (and if necessary widening) which providers/paths populate `chanceOfRain` for the periods the user is actually looking at.
- Add a new, separate percentage display elsewhere (e.g. tooltip) instead of restoring the existing inline one — rejected; the spec's Assumptions pin this to the existing inline "mm · %" location, matching what the user says used to work.

## 2. The "sticky header" is the timeline's per-row sticky title column

**Decision**: The pinned element is `.weather-timeline-row-title` (`src/index.css`, `position: sticky; left: 0; z-index: 2`), applied to every row (`Rain`, `Wind`, `Temp`, `Weather`) inside `.weather-timeline-row-label-wrap` in `WeatherIconOverview.tsx`. Removing the pin means dropping `position: sticky` (and its `left`/`z-index`/opaque-background support) from this rule so the title scrolls with the row instead of staying fixed during horizontal scroll.

**Rationale**: Confirmed directly by the user ("the sticky part that is taken space over the graph on mobile during scroll left right. the row title"), and it's the only `position: sticky` rule in the codebase that behaves this way (the Details/graph view's window-toggle header — the thing spec `038` called "the sticky header" — isn't actually `position: sticky` anywhere and doesn't move during horizontal scroll, so it's a different, unrelated element).

**Alternatives considered**:
- Keep `position: sticky` but shrink the column's width — rejected; the user explicitly said it's "not needed", i.e. asked for the pinning behavior to go away, not for it to be resized.
- Remove the title text/column entirely — rejected; FR-005 requires the label to remain visible and associated with its data (including for screen readers), just not pinned during scroll.

## 3. Accessibility of an unpinned row title

**Decision**: `.weather-timeline-row-title` keeps its current markup/text content; only the sticky positioning is removed. No `aria-*` attributes need to change, since removing `position: sticky` doesn't affect the accessibility tree — the title element is already correctly associated with its row.

**Rationale**: `position: sticky` is a purely visual/layout property; assistive technology already reads the title in document order regardless of whether it's pinned. FR-005's requirement is satisfied by leaving the existing DOM structure untouched and changing only the CSS positioning rule.

**Alternatives considered**: Restructuring rows to a different DOM layout (e.g. separate scroll containers for title vs. data) — rejected as unnecessary complexity; a plain (non-sticky) flex child achieves the same visual result with a single CSS property change.

## 4. Testing approach

**Decision**: Use the existing Vitest + Testing Library integration suite (`tests/integration/weatherIconOverview.test.tsx`), which already has assertions (`gives every timeline row a sticky title-column element`, per-row chance-of-rain rendering tests) to update in place: flip the "sticky" assertion to confirm the class/rule no longer applies `position: sticky` (jsdom can't assert computed sticky scroll behavior, so this stays a CSS-rule-level check, consistent with how `018-dashboard-visual-redesign`'s own quickstart already flagged sticky-behavior as needing manual/Playwright verification, not jsdom), and add/confirm a case where `chanceOfRain > 0` is present alongside a low-confidence (icon-suppressed) period to lock in FR-001/FR-002 independence.

**Rationale**: Matches the project's existing testing conventions instead of introducing a new tool or pattern.

**Alternatives considered**: Adding new Playwright/browser-based tests — rejected as out of scope; the existing manual-quickstart + Vitest combination the project already uses for sticky-CSS features is sufficient.
