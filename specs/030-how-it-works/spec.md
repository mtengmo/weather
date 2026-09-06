# Feature Specification: "How This Works" Documentation Page

**Feature Branch**: `030-how-it-works`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "do a readme/documentation page, in the footer how this site works."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand what the app does and where its data comes from (Priority: P1)

A user who has been using the app for a while — or a first-time visitor who's curious — wants a
plain-language explanation of what the app shows, where the weather data comes from, and why a
reading sometimes changes (e.g. why a forecast segment is dashed, or why a warning banner
appeared) — without leaving the app or reading source code.

**Why this priority**: This is the entire feature — a single, accessible explanation reachable
from anywhere in the app.

**Independent Test**: From any screen, open the "How this works" page via the footer; it shows a
plain-language explanation covering the app's core views and its data sources, and can be closed
to return to exactly where the user was.

**Acceptance Scenarios**:

1. **Given** the user is on any screen (Overview, Details, graph, or Map), **When** they use the
   footer's "How this works" control, **Then** a documentation page/panel opens explaining what
   the app does, its main views, and where its weather data comes from.
2. **Given** the documentation page is open, **When** the user closes it, **Then** they return to
   the exact screen and state they were on before opening it — nothing about their current view
   or data is disturbed.
3. **Given** the documentation page is open, **When** the user reads it, **Then** every current
   feature that meaningfully affects what they see — the three time-range views, the observed vs.
   forecast distinction, the UV risk indicator, and the weather-warning banner — is mentioned in
   plain language, not left for the user to discover unexplained.

---

### Edge Cases

- What happens if a described feature (e.g. the UV indicator or warnings banner) isn't currently
  showing anything for the user's location? The explanation still describes what the feature is
  and when it would appear — it doesn't require the feature to be actively visible to be
  documented.
- What happens on a very small (mobile) screen? The page remains fully readable and closable
  without requiring horizontal scrolling, consistent with how every other panel in the app
  (Display menu, Location panel, Privacy notice) already behaves responsively.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app's footer MUST offer a control that opens a "How this works" documentation
  page, reachable from every screen the footer already appears on.
- **FR-002**: The documentation page MUST explain, in plain language: what the app shows overall;
  its three time-range views (24 hours / 3 days / 7 days) and what each one covers; the visual
  distinction between observed (already-happened) and forecast (predicted) data; which weather
  data sources are used and how they're combined; the UV risk indicator and when it appears; and
  the weather-warning banner and when it appears.
- **FR-003**: The documentation page MUST be closable, returning the user to their exact prior
  screen and state (selected location, active view/tab, any open panel) without triggering a
  fresh data fetch or navigation away from where they were.
- **FR-004**: The documentation page MUST NOT require leaving the app (no external link as the
  only way to read it) — it opens and closes in place, the same way the existing Privacy notice
  already does.
- **FR-005**: The documentation page's content MUST stay accurate to the app's currently shipped
  feature set — it is a living explanation, not a one-time snapshot, and MUST be revisited
  whenever a future feature meaningfully changes what a user sees.

### Key Entities

*(No new data entities — this is a static, in-app explanatory page; it reads no user data and
persists nothing.)*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can find and open the "How this works" page from the footer in
  one action, from any screen.
- **SC-002**: After reading the page, a user can correctly explain, in their own words, why some
  parts of a chart look different from others (solid vs. dashed) and what the UV badge/warning
  banner mean when they appear — without needing to ask anyone or search outside the app.
- **SC-003**: Closing the page never changes the user's selected location, active view, or
  triggers any visible reload or refetch.

## Assumptions

- **Placement and mechanism**: A footer button opens an in-app panel/dialog, mirroring the
  existing "Privacy" button and `PrivacyNotice` panel exactly (same open/close mechanism,
  keyboard/focus behavior, and responsive treatment) — chosen for consistency with the one
  existing footer-triggered explanatory panel, rather than introducing a second, differently
  behaving pattern.
- **Scope**: Covers the app's own behavior and data sourcing (what the user sees and why) — it
  does not duplicate the `Privacy` panel's content (data handling/local storage/analytics), which
  remains a separate, focused control.
- **Audience**: Written for an end user of the app (plain language, no code, no internal
  architecture, no mention of source files or specs) — a separate concern from any
  developer/agent-facing documentation the repository maintains for itself (e.g. its own
  `README.md`), which is out of scope for this in-app page.
- **No versioning/history**: The page describes the current feature set only — it does not
  include a changelog or version history (the footer's existing version string already serves
  that purpose for anyone who needs it).
