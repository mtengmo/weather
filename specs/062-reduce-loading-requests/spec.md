# Feature Specification: Reduce Loading Requests

**Feature Branch**: `062-reduce-loading-requests`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "is it possible to improve loading times? alot of api request happens now? could we split it per 24h / 3d / 7d ? Also the details page is not needed to load directly."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See weather data as soon as it's ready, not all at once (Priority: P1)

A user selects a location. Today, the page waits for every category of data (the location's own
24-hour readings, the blended multi-source forecast, and the extended 7-day outlook) to finish
loading together before showing any of them — so if one of those is slow, the whole page sits on
"Loading…" even though the others already arrived. Instead, each piece of information should
appear on screen as soon as it individually arrives.

**Why this priority**: This is the most direct "loading feels slow" fix — it doesn't reduce the
number of requests, but it removes the current worst-case wait (the slowest single request holding
back everything else).

**Independent Test**: Simulate one data source responding slower than the others for a given
location; confirm the faster pieces of the page render before the slow one arrives, rather than the
whole page waiting.

**Acceptance Scenarios**:

1. **Given** a location is selected, **When** the location's own 24-hour reading has arrived but
   the multi-source forecast blend hasn't yet, **Then** the parts of the page that only depend on
   the 24-hour reading are already visible.
2. **Given** all pieces of data for a location eventually arrive, **When** they've all finished,
   **Then** the page looks exactly as it does today — this reordering changes only *when* things
   appear, not what they ultimately show.

---

### User Story 2 - Switching between 24h/3d/7d doesn't repeat a request already made (Priority: P1)

A user opens a location, then switches between the 24-hour, 3-day, and 7-day views. Today, some of
those switches trigger a fresh network request for data that was already fetched moments earlier
for the very same location (e.g. switching to the 7-day view re-fetches data the page already
fetched right after the location was first opened, to build the always-visible "Today" summary and
7-day strip). The app should recognize when it already has the data a newly-selected view needs and
reuse it instead of asking again.

**Why this priority**: This is the most literal reading of "split it per 24h/3d/7d, alot of api
requests happens now" — directly cuts the number of requests fired during a normal browsing
session, not just their perceived cost.

**Independent Test**: Load a location on the 24-hour view (which already fetches enough data to
build the 7-day summary shown alongside it), switch to the 7-day view, and confirm no new network
request for that location/window combination fires — the already-fetched data is reused.

**Acceptance Scenarios**:

1. **Given** a location was just opened on the 24-hour view, **When** the user switches to the
   7-day view, **Then** no duplicate request is made for data the app already fetched for that
   location.
2. **Given** a location was just opened on the 7-day view, **When** the user switches to the
   24-hour view, **Then** no duplicate request is made either — the reuse works in both directions.
3. **Given** a user switches between the 3-day and 7-day views (which already share one underlying
   fetch today), **When** switching back and forth repeatedly, **Then** this continues to trigger no
   additional requests, unchanged from today.

---

### User Story 3 - Comparison data stays deferred until Details is opened (Priority: P3)

A user opens a location and stays on the Overview, never opening the Details/graph comparison view.
The extra data that only the Details view uses (nearby-station comparisons) must not be fetched
until the user actually opens that view.

**Why this priority**: Lowest priority because this already holds true in the app today — this
story exists to lock it in as a guarantee (regression protection) alongside the other two changes
in this feature, not to change current behavior.

**Independent Test**: Open a location and stay on the Overview without opening Details; confirm no
nearby-station comparison request is ever made. Then open Details for the first time and confirm
exactly one such request fires at that point.

**Acceptance Scenarios**:

1. **Given** a location is open on the Overview, **When** the user never opens the Details/graph
   view during their visit, **Then** no nearby-station comparison request is made during that
   visit.
2. **Given** a location is open on the Overview, **When** the user opens the Details/graph view for
   the first time, **Then** exactly one nearby-station comparison request fires at that point.

---

### Edge Cases

- What happens if the user switches views again while a request from the previous view switch is
  still in flight? The in-flight request is still allowed to complete and populate its data;
  switching views doesn't need to cancel it, since the data it returns remains useful for whichever
  view needs it.
- What happens if a user changes location while data from the previous location is still loading?
  Unaffected by this feature — already handled today (a location change discards the previous
  location's in-flight results rather than mixing them with the new location's).
- What happens if reusing already-fetched data means showing a location's 7-day view built from
  data that's now a few minutes old, versus a fresh fetch? Acceptable — this app already tolerates
  that staleness window elsewhere (the periodic auto-refresh feature already re-fetches every 15
  minutes; reuse between view switches doesn't introduce staleness that refresh doesn't already
  bound).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render each independently-loading category of a location's weather
  data (its own recent/near-term readings, the blended multi-source forecast, the extended 7-day
  outlook) as soon as that category's data has arrived, without waiting for every other category to
  finish loading first.
- **FR-002**: The system MUST NOT issue a new network request for a location's data (for a given
  time range) when it already holds data covering that exact time range for that same location from
  a very recent prior request.
- **FR-003**: Switching between the 24-hour, 3-day, and 7-day views for the currently-open location
  MUST reuse already-fetched data whenever it's available, in both directions (24h→7d and 7d→24h).
- **FR-004**: The system MUST continue to defer fetching Details/graph-view-only comparison data
  (nearby-station comparisons) until the user opens that view for the first time during their
  visit — this feature must not regress that existing behavior.
- **FR-005**: Reusing already-fetched data instead of re-fetching MUST NOT change what the user
  ultimately sees — the displayed values must be identical to what a fresh fetch would have shown
  (aside from the ordinary staleness window this app already tolerates elsewhere, per Edge Cases).
- **FR-006**: A genuine location change MUST still fetch fresh data for the new location — the
  request-reuse behavior in FR-002/FR-003 applies only within a single already-open location, never
  across a location switch.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Opening a location and then visiting all three of its 24-hour, 3-day, and 7-day views
  in a single session results in no more network requests than opening just one of those views
  alone would have.
- **SC-002**: The first piece of a newly-opened location's weather data becomes visible to the user
  at least as quickly as today, and never later — this feature must not introduce a new wait
  anywhere it didn't already exist.
- **SC-003**: A visit that never opens the Details/graph view issues zero nearby-station comparison
  requests, for 100% of such visits.

## Assumptions

- "3-day" and "7-day" are two display resolutions of the same underlying fetched range, not two
  separate fetches — this already holds true today (confirmed in the existing codebase) and this
  feature preserves rather than changes it.
- The Details/graph view's nearby-station comparison data already loads lazily, only once Details
  is first opened, rather than as part of the initial page load — confirmed already true in the
  existing codebase. User Story 3 exists to explicitly guarantee this doesn't regress while the
  other two changes in this feature are made, not because it's currently broken.
- "Very recent" in FR-002 means within this app's existing staleness tolerance — the same window
  already governed by the app's periodic auto-refresh (every 15 minutes) — not a new, separately
  configurable cache lifetime.
- This feature is about *when* and *how many* requests are made for data the app already shows
  today — it does not add, remove, or change the meaning of any weather data category itself.
