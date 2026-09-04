# Feature Specification: Dashboard Polish Round Two

**Feature Branch**: `016-dashboard-polish-round-two`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "1. The forecast with multiple sources, want to have each source one each one series on temp. 2. The 3d and 7d screen, I want to have a 'day marker' vertical line, pretty shadow, but at least make it easier to identity new day. 3. Rename the button Last 24h, Last 3d and Last 7d do what it is, 24h window, 3d window, 7d window? 4. Last 3d are missing 3d observation, only one day. 5. Back to graph button, it should be moved up to the right, and renamed Details or so? 6. Make a map screen page with weather on the nearest locations, is that possible without backend? Not sure how to visualize observation and forecast on same page, but would be nice. Maybe this could be on another iteration, see if you can come up with something at least, probably need clarify. 7. Change location, could it fit in the header also? 8. Is it possible to make a PWA app for it for mobiles? Or what does it call when you can install it? 9. Add a footer, with version. Bump version with every build. Small text. Privacy notice also. 10. Add Google GTM analytics tag."

## Clarifications

### Session 2026-09-04

- Q: How should the map screen (item 6) be treated in this iteration? → A: Minimal v1 now — a map showing pins for the user's favorited/recently-viewed locations (not open-ended "nearby" discovery), each pin opens that location's existing Overview. The question of visualizing observed and forecast data together on the map itself stays open for a future iteration.
- Q: What is item 1 ("each source its own series on temp") actually asking for, given the existing "Combine forecast sources" toggle already shows this on the classic 24-hour graph? → A: Extend the same multi-source-lines idea to the Overview (currently classic-graph-only).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The 3-day view actually shows 3 days (Priority: P1)

A user opening the 3-day Overview sometimes sees only a single day's worth of sub-day columns instead of three, even for a location whose forecast should reach further out. The 3-day view reliably shows as many of its 3 days as the location's actual forecast data supports.

**Why this priority**: A defect in a just-shipped feature — the view is materially incomplete for at least some locations, undermining the whole point of the 3-day option.

**Independent Test**: Open the 3-day Overview for a location known to have multi-day forecast coverage; confirm all 3 days' worth of sub-day columns appear (or, for a location whose forecast genuinely doesn't reach that far, confirm exactly as many days appear as the forecast supports — never fewer than that).

**Acceptance Scenarios**:

1. **Given** a location whose forecast data reaches at least 3 days out, **When** the 3-day Overview renders, **Then** all 3 days' worth of sub-day columns are shown.
2. **Given** a location whose forecast reaches less than 3 days out, **When** the 3-day Overview renders, **Then** exactly as many days as the forecast supports are shown, matching the forecast's own actual reach.

---

### User Story 2 - Combined forecast sources also available on the Overview (Priority: P1)

Today, turning on "Combine forecast sources" only affects the classic graph's 24-hour temperature chart — the Overview has no equivalent. A user on the Overview can also see each forecast source's own line, plus their average, for the temperature row, when the same toggle is on.

**Why this priority**: Directly requested; closes a gap where an app-wide-feeling toggle silently does nothing on one of the app's two main views, mirroring the same gap the High/Low toggle had before it was fixed.

**Independent Test**: Turn on "Combine forecast sources"; open the Overview for a location with more than one forecast source available; confirm the temperature row reflects each source individually, distinguishable from the plain single-source display shown when the toggle is off.

**Acceptance Scenarios**:

1. **Given** "Combine forecast sources" is on and a location has more than one forecast source, **When** the Overview's temperature row renders forecast periods, **Then** each source's own reading is visibly distinguishable, not just a single blended value.
2. **Given** the toggle is off, **When** the Overview renders, **Then** it looks exactly as it does today (unaffected).
3. **Given** a location where only one forecast source has data, **When** the toggle is on, **Then** the Overview is unaffected (no misleading single-source "combination").

---

### User Story 3 - A day-boundary marker makes new days easy to spot (Priority: P2)

On the 3-day and 7-day Overview timelines, every column looks the same regardless of which calendar day it belongs to, making it hard to tell at a glance where one day ends and the next begins — especially on the 3-day view, where several sub-day columns belong to the same day. A subtle vertical marker appears at each day boundary, so a new day is easy to identify without reading every column's label.

**Why this priority**: Directly requested; a readability improvement, valuable but not blocking any existing capability.

**Independent Test**: Open the 3-day Overview; confirm a visually distinct vertical marker appears between each day's last sub-day column and the next day's first. Open the 7-day Overview; confirm the same marker convention appears between every pair of adjacent days (or is reasonably omitted there, since every column is already its own day).

**Acceptance Scenarios**:

1. **Given** the 3-day Overview, **When** it renders, **Then** a visually distinct marker appears at each boundary between one calendar day's sub-day columns and the next's.
2. **Given** the marker, **When** compared to the existing "Now" marker line, **Then** it's visually distinguishable from it (a user can tell a day boundary from "now" at a glance).

---

### User Story 4 - Overview window buttons describe what they show (Priority: P2)

The Overview's three window buttons ("Last 24 hours," "Last 3 days," "Last 7 days") are being renamed to more directly describe what each shows.

**Why this priority**: Directly requested; a small clarity improvement to existing, already-shipped controls.

**Independent Test**: Open the Overview; read the three window buttons; confirm their labels clearly and consistently describe the time span each one shows.

**Acceptance Scenarios**:

1. **Given** the Overview, **When** the window-toggle buttons render, **Then** each button's label directly names the time span it switches to, using a consistent naming pattern across all three.

---

### User Story 5 - A clearer "Details" action, repositioned (Priority: P2)

The Overview's "Back to graph" button — which actually opens the classic chart-and-table detail view, not literally "going back" anywhere — is renamed to reflect what it does and repositioned to the header's top-right, alongside the app's other header controls.

**Why this priority**: Directly requested; a naming/placement clarity fix for an existing, frequently-used control.

**Independent Test**: Open the Overview; confirm a button in the header's top-right area, labeled to reflect "view details" rather than "back," opens the classic graph/detail view when clicked.

**Acceptance Scenarios**:

1. **Given** the Overview, **When** the header renders, **Then** a details-labeled button appears in the top-right of the header area.
2. **Given** that button, **When** clicked, **Then** it switches to the classic graph view exactly as "Back to graph" does today.

---

### User Story 6 - Change location is reachable from every screen (Priority: P2)

A user on any screen (Overview, classic graph, or the new map) can always find and use "Change location" from the header, without needing to first navigate elsewhere.

**Why this priority**: Directly requested; ensures a core, frequently-needed action is never buried, especially important once a new map screen is added.

**Independent Test**: From each screen the app offers, confirm "Change location" is visible and usable directly from the header, without extra navigation.

**Acceptance Scenarios**:

1. **Given** any screen the app offers, **When** its header renders, **Then** "Change location" is present and directly usable there.

---

### User Story 7 - The app can be installed like a native app (Priority: P2)

A user on a mobile (or desktop) browser can install the weather app to their home screen or app list, so it opens and behaves like a native app — its own icon, its own window, and continued availability of its already-viewed content when briefly offline.

**Why this priority**: Directly requested; meaningfully improves how a returning user reaches the app, independent of any other change in this set.

**Independent Test**: Visit the app in a supporting mobile browser; confirm an "install" or "add to home screen" prompt/option is available; install it; confirm it launches as its own app (no browser address bar) with the app's own name and icon.

**Acceptance Scenarios**:

1. **Given** a supporting browser, **When** the user chooses to install the app, **Then** it installs with its own name and icon.
2. **Given** the installed app, **When** launched, **Then** it opens in its own standalone window, not a browser tab.
3. **Given** the installed app was recently used online, **When** opened with no network connection, **Then** it still opens and shows the app's shell (not a browser error page), even if fresh weather data can't load.

---

### User Story 8 - A footer shows the current version and a privacy notice (Priority: P3)

Every screen shows a small, unobtrusive footer with the app's current version and a link to a short privacy notice explaining what data the app handles.

**Why this priority**: Directly requested; useful for support/debugging and for transparency, but not blocking any existing capability.

**Independent Test**: Open any screen; confirm a small footer is present showing a version identifier and a privacy notice link; confirm the version identifier changes after a new build is published.

**Acceptance Scenarios**:

1. **Given** any screen, **When** it renders, **Then** a small footer is visible showing the app's current version and a privacy notice link.
2. **Given** two different builds of the app, **When** their footers are compared, **Then** they show different version identifiers.
3. **Given** the privacy notice link, **When** clicked, **Then** it shows a short, plain-language explanation of what data the app handles (e.g., that it runs entirely in the browser, what if anything is stored locally, and that anonymous usage analytics are collected — see User Story 9).

---

### User Story 9 - Anonymous usage analytics (Priority: P3)

The app collects anonymous usage analytics (page views and basic interaction data) via Google Analytics, so usage patterns can be understood over time.

**Why this priority**: Directly requested; supports future prioritization decisions but has no effect on any user-facing behavior other than the footer's privacy disclosure (User Story 8).

**Independent Test**: Load the app; confirm analytics tracking requests are sent to the configured Google Analytics property.

**Acceptance Scenarios**:

1. **Given** the app is loaded in a browser without tracking-blocking enabled, **When** a page loads, **Then** an analytics tracking request is sent.
2. **Given** the privacy notice (User Story 8), **When** a user reads it, **Then** it discloses that anonymous usage analytics are collected.

---

### User Story 10 - A map of the user's favorite/recent locations (Priority: P3)

A new map screen shows pins for the user's favorited and recently-viewed locations. Selecting a pin opens that location's Overview, the same way selecting it from "Change location" already does.

**Why this priority**: Directly requested as a "would be nice," explicitly flagged by the requester as needing scoping — delivered here as a deliberately minimal first version; a fuller "nearby locations" discovery experience and combined observation+forecast map visualization are left for a future iteration.

**Independent Test**: Open the map screen; confirm it shows a pin for each of the user's favorited and recently-viewed locations; select a pin; confirm it opens that location's Overview.

**Acceptance Scenarios**:

1. **Given** the user has favorited and/or recently viewed one or more locations, **When** the map screen opens, **Then** a pin appears for each one.
2. **Given** a pin, **When** selected, **Then** the app switches to that location's Overview.
3. **Given** the user has no favorites and has viewed no locations yet, **When** the map screen opens, **Then** it shows a helpful empty-state message rather than a blank map.
4. **Given** the map screen, **When** compared to the Overview/classic graph, **Then** it does not attempt to show observation or forecast values directly on the map itself — only location pins (that combined visualization is explicitly deferred).

---

### Edge Cases

- If a location's forecast reaches only partway into a day (e.g., 2 of 5 sub-day periods), User Story 1's fix must still show that day's available sub-day columns, not hide the whole day (only whole days beyond the forecast's reach are omitted, per the app's existing gap-vs-fabrication convention).
- The day-boundary marker (User Story 3) must not visually collide with or be confused for the existing "Now" marker line when a day boundary and "now" happen to fall very close together.
- If a browser doesn't support installability (User Story 7), the app continues to work normally as a regular website — no degraded experience for users who don't install it.
- If analytics collection (User Story 9) is blocked by the browser or an extension, the app must continue to function normally — analytics is purely observational, never load-bearing for any feature.
- The map screen (User Story 10) must handle a location with an unusual or missing display name gracefully (same fallback behavior already used elsewhere in the app).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The 3-day Overview MUST show every day, of its 3, that the location's forecast data actually reaches — never fewer days than the forecast supports.
- **FR-002**: When "Combine forecast sources" is on, the Overview's temperature row MUST show each available forecast source's own reading, distinguishable from a single blended value.
- **FR-003**: The Overview MUST show a visually distinct marker at each day boundary on the 3-day and 7-day views, distinguishable from the existing "Now" marker.
- **FR-004**: The Overview's three window buttons MUST each be labeled to directly describe the time span they switch to, using a consistent naming pattern.
- **FR-005**: The Overview's detail-view button MUST be labeled to describe what it does (opening details), not "back," and MUST appear in the header's top-right area.
- **FR-006**: "Change location" MUST be reachable directly from the header on every screen the app offers.
- **FR-007**: The app MUST be installable to a supporting device's home screen/app list, launching in its own standalone window with its own name and icon.
- **FR-008**: The installed app MUST still open (showing its shell) when launched with no network connection.
- **FR-009**: Every screen MUST show a small footer with the app's current version and a link to a privacy notice.
- **FR-010**: The displayed version MUST change with every new build published.
- **FR-011**: The privacy notice MUST explain, in plain language, what data the app handles, including that anonymous usage analytics are collected.
- **FR-012**: The app MUST send anonymous usage analytics to the configured Google Analytics property.
- **FR-013**: A new map screen MUST show a pin for each of the user's favorited and recently-viewed locations.
- **FR-014**: Selecting a map pin MUST open that location's Overview.
- **FR-015**: The map screen MUST show a helpful empty state when there are no favorited or recently-viewed locations yet.
- **FR-016**: The map screen MUST NOT attempt to render observation or forecast values directly on the map in this iteration.

### Key Entities

- **Day Boundary Marker**: A visual indicator on the 3-day/7-day Overview timelines marking where one calendar day's columns end and the next begin.
- **App Version**: A build-identifying value shown in the footer, distinct per published build.
- **Privacy Notice**: A short, plain-language disclosure of what data the app handles, linked from the footer.
- **Map Pin**: One favorited or recently-viewed location's marker on the new map screen, opening that location's Overview when selected.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a location with 3+ days of forecast reach, the 3-day Overview shows all 3 days' worth of columns, 100% of the time.
- **SC-002**: With "Combine forecast sources" on, the Overview's temperature row shows every available source's own reading, verified across at least two forecast sources.
- **SC-003**: A user can visually identify each day boundary on the 3-day/7-day Overview without reading any column's text label, verified by inspecting the rendered marker.
- **SC-004**: All three Overview window buttons and the details button read as self-explanatory to a first-time viewer, without needing to click each to find out what it does.
- **SC-005**: "Change location" is present in the header on 100% of the app's screens.
- **SC-006**: A user can install the app and reopen it as a standalone app, and it still opens with no network connection, on at least one major mobile browser.
- **SC-007**: The footer's version identifier changes on every new build, verified across two consecutive builds.
- **SC-008**: The map screen shows a pin for every favorited/recently-viewed location and correctly opens the Overview for any pin selected.

## Assumptions

- User Story 10 (map) is deliberately scoped to the user's own favorited/recently-viewed locations, not open-ended "nearby" location discovery — the latter would need either a third-party places API or a much larger dataset than this app currently has access to, and was explicitly flagged by the requester as needing scoping down for now.
- Combining observed and forecast weather values directly on the map (User Story 10) is out of scope for this iteration — pins link to the existing Overview instead, which already solves that visualization problem for a single location.
- "PWA" (Progressive Web App — User Story 7) is the standard, well-understood term for "an installable web app"; this feature delivers the standard baseline (installable, app-shell-offline-capable) rather than full offline data caching of weather history.
- The day-boundary marker (User Story 3) is a purely visual/styling addition — it introduces no new data and does not change what any existing column shows.
- "Bump version with every build" (User Story 8) means the footer's version identifier is generated automatically as part of the build process, not manually edited per release.
- The privacy notice (User Story 8) is a plain-language summary appropriate for a small client-side app with no backend and no accounts — not a legally-reviewed formal policy document; formal legal review is out of scope.
- Analytics (User Story 9) uses the specific Google Analytics property the requester already provided; no additional tracking beyond standard page-view/interaction analytics is introduced.
- Renamed button labels (User Stories 4 and 5) are a wording change only — no change to what each button does.
