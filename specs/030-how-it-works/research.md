# Research: "How This Works" Documentation Page

## §1 — Reuse `PrivacyNotice`'s exact pattern

**Decision**: `PrivacyNotice.tsx` is a small, self-contained panel: `role="dialog"`, an
`aria-label`, a close button, and static `<p>` content — triggered from `Footer.tsx` via a
`useState` boolean and a plain `<button>`. The new `HowItWorks` panel copies this shape exactly
(own `role="dialog"`, own `aria-label`, own close button, own `useState` in `Footer.tsx`).

**Rationale**: This is the one existing footer-triggered explanatory panel in the app — matching
it exactly means no new interaction pattern, no new CSS family, and no new accessibility surface
to get right from scratch. The spec's own Assumptions section calls for exactly this.

**Alternatives considered**:
- A dedicated full-screen route/view (like Details/Graph/Map) — rejected: those views represent
  actual app state (a selected location's data) that participates in navigation history and
  "Back" semantics; this panel is pure static content with no such state, so the lighter overlay
  pattern is the correct fit, not the heavier full-view pattern.

## §2 — Content source of truth

**Decision**: The panel's content is authored directly as JSX in `HowItWorks.tsx` (plain
paragraphs/headings, same as `PrivacyNotice.tsx`), not generated from or kept in sync with
`README.md` — the two serve different audiences (developer-facing vs. end-user-facing, per the
spec's own Assumptions) and mixing their content sources would couple an in-app user-facing panel
to a file whose primary audience and tone are different.

**Rationale**: Keeps the implementation trivial (no markdown-loading pipeline, no build step) and
matches the "no implementation-detail leakage" boundary the spec itself draws between this page
and developer documentation.

## §3 — What "every current feature" means concretely (FR-002)

**Decision**: Cross-checked against the app's actually-shipped feature set as of this session:
the 24-hour / 3-day / 7-day views (`OVERVIEW_WINDOWS` in `WeatherIconOverview.tsx`), the solid
(observed) vs. dashed (forecast) line convention (`splitObservedForecast` in the same file), the
three data sources (SMHI, Open-Meteo, MET Norway — `SOURCE_DISPLAY_NAMES` in `App.tsx`), the UV
risk badge (`027-uv-index-alert`), and the weather-warning banner (`028-severe-weather-warnings`).
Each gets one short paragraph.

**Rationale**: Grounds "plain-language explanation" in the concrete, current feature list rather
than a vague aspiration — directly satisfies FR-002's enumerated list and SC-002's "can explain
in their own words" outcome.
