# Feature Specification: Timeline Polish and Header Consolidation

**Feature Branch**: `009-timeline-polish-and-header`

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: "On my mobile, the timezone is 3PM, but I'm in Sweden. Works ok on my laptop. The middle hour have no data, maybe simulate data for 'now' hour? On laptop, not possible to scroll the picture left/right. The cloud coverage is already handled by the icon, remove it from the diagram. 'Feels like' temp could be removed also. Gusts could be combined with wind, gust in (). No decimals for gust and wind. Move up favorites to the header also. Remove header 'Weather History', simplify header so it doesn't eat too much space. Cache location. Move up search also to the header."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A compact, consolidated header (Priority: P1)

A returning user opens the app and wants to get to their weather data as quickly as possible without scrolling past a large title and separate search/favorites sections. The header area is condensed: the "Weather History" title is removed (or shrunk to not dominate the screen), and place search and favorites are relocated into the header alongside the existing theme/unit/window controls, so the whole control surface sits together in one compact strip at the top of the page.

**Why this priority**: Every session starts here — a bloated header pushes the actual weather data below the fold on every device, especially mobile. This is the highest-leverage, lowest-risk change.

**Independent Test**: Load the app on a phone-sized viewport; confirm the search box and favorites list are reachable from the header area without scrolling past a large title, and that the vertical space consumed before the first chart/timeline row is visibly reduced compared to today.

**Acceptance Scenarios**:

1. **Given** the app has just loaded, **When** the user looks at the top of the page, **Then** there is no large standalone "Weather History" heading consuming its own row — the header is a single compact strip.
2. **Given** the app has just loaded, **When** the user wants to search for a place, **Then** the search input is visible within the header area, not further down the page.
3. **Given** the user has saved favorite places, **When** the user looks at the header, **Then** their favorites are listed/selectable from the header area rather than in a separate section below the graph.
4. **Given** the app is viewed on a narrow (mobile-width) screen, **When** the header renders, **Then** its controls wrap or stack without any control being cut off or unreachable.

---

### User Story 2 - A leaner set of timeline rows (Priority: P2)

A user viewing the timeline dashboard finds the cloud-cover row redundant (the same information is already visible in the condition icon), the "Feels like" row adds a second temperature line without enough distinct value, and gusts sit awkwardly as their own separate row from wind. The dashboard is simplified: the cloud-cover and feels-like rows are removed, and gust values are folded into the wind row as a parenthetical next to the wind speed, with both values shown as whole numbers.

**Why this priority**: Directly requested simplification of the just-shipped 008 timeline; reduces visual clutter and vertical scrolling once the header (User Story 1) is already addressed, but is independent of it.

**Independent Test**: Open the timeline for a location with full data; confirm there is no cloud-cover row and no feels-like row, and that the wind row shows one line per column formatted like `12 (18) m/s` (wind speed, then gust in parentheses, no decimals on either number) — falling back to just the wind speed with no parentheses when gust data isn't available for that column.

**Acceptance Scenarios**:

1. **Given** a timeline with cloud-cover data available, **When** it renders, **Then** no cloud-cover row appears anywhere in the timeline.
2. **Given** a timeline with feels-like data available, **When** it renders, **Then** no feels-like row appears anywhere in the timeline.
3. **Given** a timeline column with both wind speed and gust data, **When** the wind row renders that column, **Then** it shows the wind speed and gust as whole numbers in the form `<speed> (<gust>) <unit>`.
4. **Given** a timeline column with wind speed but no gust data, **When** the wind row renders that column, **Then** it shows just the whole-number wind speed with no parentheses.

---

### User Story 3 - Fix timeline display and navigation defects (Priority: P2)

On a mobile phone, the hourly time labels in the timeline show a value that doesn't match the user's actual local time in Sweden (e.g. showing "3" when it should reflect their real local hour) — the same page works correctly on a laptop. Separately, on a laptop the timeline can't be scrolled left/right when its content is wider than the visible area, and the single column that represents "now" (sitting exactly at the observed/forecast boundary) frequently shows no data at all in every row, leaving a visible empty gap right at the most important point on the timeline.

**Why this priority**: These are defects in the just-shipped 008 timeline that undermine its core purpose (an at-a-glance, trustworthy view of "now" plus recent/upcoming hours) on real devices; fixing them is as important as the row cleanup in User Story 2, but is scoped separately since it's defect-fixing rather than simplification.

**Independent Test**: On a mobile device (or an emulated mobile viewport) set to a Swedish timezone, confirm the hourly labels match the device's actual local time. On a laptop-sized viewport, confirm the timeline can be scrolled horizontally with a mouse/trackpad when its content overflows the visible width. With a series that has an observed/forecast boundary, confirm the "now" column shows an interpolated value in each row instead of a visible gap.

**Acceptance Scenarios**:

1. **Given** the app is opened on a mobile device whose system timezone is Swedish local time, **When** the hourly timeline renders, **Then** each column's hour label matches that device's actual local hour (consistent with how the same data renders on a laptop).
2. **Given** the 24-hour timeline's total column width exceeds the visible viewport width on a laptop, **When** the user scrolls horizontally (trackpad, scroll wheel, or drag) over the timeline, **Then** the timeline content pans left/right accordingly.
3. **Given** a series whose observed data ends and forecast data begins at different points such that the exact "now" column has no directly-measured or directly-forecast reading, **When** the timeline renders, **Then** that column shows a value derived from its neighboring observed/forecast readings (visually marked as an estimate) rather than a blank gap, for every core row.
4. **Given** a series where "now" falls within a run of genuinely missing data on both sides (not just the single boundary column), **When** the timeline renders, **Then** the gap indicator still appears rather than fabricating a value with no nearby readings to interpolate from.

---

### User Story 4 - Remember the last-viewed location (Priority: P3)

A returning user who previously viewed a specific place (their current position or a favorite) doesn't want to redo that selection (or re-grant/re-resolve geolocation) every time they open the app. The app remembers the last-viewed location and shows it again automatically on the next visit.

**Why this priority**: A convenience improvement independent of the header and timeline changes above; valuable but lower-impact than fixing active defects or decluttering the primary view.

**Independent Test**: Select a specific place (not the default current-position flow), reload the app, and confirm the same place is shown again without the user needing to re-select it or re-grant geolocation.

**Acceptance Scenarios**:

1. **Given** the user has selected a specific location (favorite or search result), **When** they reload the app in a new session, **Then** that same location is shown again automatically.
2. **Given** no location has ever been viewed in this browser before, **When** the app loads, **Then** it falls back to today's existing default behavior (current-position geolocation, or the first favorite, per existing behavior).
3. **Given** a location was cached from a previous session, **When** the user explicitly switches to a different location, **Then** the newly-selected location becomes the one remembered for next time.

---

### Edge Cases

- A timeline column with no gust data at all (never present for the whole series) still shows a plain wind-speed row, matching the "row omitted only when the whole row lacks data" convention already used for other optional rows.
- The "now" column interpolation in User Story 3 must not apply to the 7-day view's day columns the same way the 24-hour view's hour columns work, since "now" isn't a single column boundary in the daily view in the same sense — the daily view's forecast/observed distinction for the current day already exists and is unaffected by this fix, which targets the hourly gap specifically.
- If the browser blocks or has no `localStorage` available, the cached-location feature (User Story 4) degrades gracefully to today's behavior (no persistence) rather than breaking the app.
- If a previously cached location is a favorite that has since been removed by the user, the cache falls back to today's default behavior rather than showing a now-deleted favorite.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The header MUST NOT display a large standalone app-title row; if a title/name is kept, it MUST NOT be the dominant visual element pushing other controls down the page.
- **FR-002**: The place-search input MUST be part of the header's control area rather than rendered further down the page.
- **FR-003**: The favorites list/selector MUST be part of the header's control area rather than rendered further down the page.
- **FR-004**: The consolidated header MUST remain usable (all controls visible/reachable, none clipped or overlapping) at both mobile-width and laptop-width viewports.
- **FR-005**: The timeline MUST NOT render a cloud-cover row.
- **FR-006**: The timeline MUST NOT render a feels-like row.
- **FR-007**: The timeline's wind row MUST display gust data (when available for a given column) as a parenthetical alongside that column's wind speed, in the form `<speed> (<gust>) <unit>`.
- **FR-008**: The timeline's wind row MUST display both wind speed and gust values rounded to whole numbers (no decimal places), regardless of unit system.
- **FR-009**: When a timeline column has wind speed data but no gust data, the wind row MUST show only the wind speed for that column (no empty parentheses).
- **FR-010**: On a device whose system/browser timezone is set to Swedish local time, the 24-hour timeline's hourly column labels MUST display that device's actual local hour, matching what the same data shows on a desktop browser.
- **FR-011**: When the 24-hour timeline's total rendered width exceeds the visible container width, the timeline MUST be scrollable horizontally via standard pointer/trackpad/mouse-wheel input, not just via a visible scrollbar being dragged.
- **FR-012**: When the single hourly column at the observed/forecast boundary ("now") has no directly-measured or directly-forecast value for a core row, the timeline MUST display a value interpolated from that row's nearest observed and forecast neighbors, visually distinguished from genuinely-measured or genuinely-forecast values.
- **FR-013**: The interpolated "now" value from FR-012 MUST NOT be produced when there is no observed neighbor, no forecast neighbor, or both are themselves missing — in those cases the existing gap indicator MUST still be shown.
- **FR-014**: The app MUST remember the most recently viewed location (favorite, search result, or current-position result) across browser sessions on the same device/browser, and MUST show that location automatically on the next visit instead of re-running the default location-resolution flow.
- **FR-015**: If no location has been cached yet (first-ever visit, or cache unavailable/cleared), the app MUST fall back to its existing default location-resolution behavior unchanged.
- **FR-016**: If the cached location no longer resolves (e.g. a cached favorite was since removed), the app MUST fall back to its existing default location-resolution behavior rather than erroring or showing a broken state.

### Key Entities

- **Cached Location**: The most recently viewed location's identifying details (coordinates, display name, source), persisted per browser so it can be restored on the next visit.
- **Timeline Wind Row**: The existing wind row's display, extended to also encode an optional gust reading per column.
- **Interpolated Point**: A timeline data point at the observed/forecast boundary whose value is derived from its nearest real neighbors rather than measured or forecast directly, carrying a marker so it renders visually distinct from both.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a representative mobile viewport, the vertical space consumed before the first piece of weather data (chart or timeline) is reduced by at least 30% compared to the current header/search/favorites layout.
- **SC-002**: 100% of hourly timeline labels shown on a device with a Swedish system timezone match that device's actual local hour, verified on at least one real or emulated mobile device.
- **SC-003**: On a laptop-width viewport where the timeline overflows the visible area, a user can reach every column via horizontal scroll input without any column being permanently unreachable.
- **SC-004**: For a series with a normal observed/forecast boundary (both neighbors present), the "now" column shows a visible value in every core row instead of a blank gap, 100% of the time.
- **SC-005**: A returning user who previously viewed a specific location sees that same location within the first render after reload, without any additional action, in at least 95% of return visits (allowing for the fallback cases in FR-015/FR-016).
- **SC-006**: The timeline shows two fewer rows (no cloud cover, no feels-like) than before, verified by inspecting a fully-populated series.

## Assumptions

- "Cache location" means persisting the last-viewed location client-side (the same mechanism already used for favorites/theme/unit preferences in this app) and using it as the initial location on load, not adding a server-side account/profile system.
- The mobile timezone/hour-label defect is a display-formatting issue (the hour label doesn't consistently reflect the device's real local time across browsers/locales), not a case where the underlying data itself is fetched for the wrong timezone — this feature scopes only the display fix.
- "Simulate data" for the now-hour gap is interpreted as a lightweight interpolation between the nearest real observed and forecast readings (consistent with how forecast/observed lines already visually bridge in the existing chart), not as fabricating an entirely independent estimate (e.g. from a third data source).
- Removing the "Weather History" header text does not require replacing it with another title; a much smaller/compact label (or no label) is acceptable as long as FR-001 is met.
- The existing desktop-scoped horizontal-scroll defect (FR-011) is about enabling scroll input generally (wheel/trackpad/drag), not about adding new visible scrollbar UI chrome — the existing `overflow-x: auto` container is the right foundation, the defect is that some interaction path isn't triggering it.
