# Feature Specification: Tengmo Väder Android App

**Feature Branch**: `071-mobile-apps`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "could you specificy a mobile app (android) and (iOS) for this app, same functionality and gui."

## Overview

Tengmo Väder is today a web app (installable as a home-screen web app) that shows observed and forecast weather for the user's current position and saved favorite places: an Overview with weather icons, a today summary card and a 7-day strip, a timeline graph (temperature, rain, wind, cloud), a details table, a map with rain/temperature/wind overlays, severe-weather warnings, UV alerts, and a weather companion character. Users choose Dark/Light theme, metric/imperial units, language (auto/English/Swedish), how many nearby comparison stations to show, and whether high/low markers are visible.

This feature delivers the same product as a native Android app, distributed through Google Play, with the same functionality and the same look as the web app, plus home-screen widgets. An iOS app is planned as a separate follow-up feature that will reuse this spec as its reference. The web app continues to exist unchanged.

## Clarifications

### Session 2026-09-26

- Q: Should home-screen widgets be included? → A: Yes, widgets are in scope (previously listed as out of scope).
- Q: Which platform comes first? → A: Android first, iOS after.
- Q: Should the apps be built natively for each platform or wrap/share the web code? → A: Native apps, chosen for the best user experience (platform-native feel, performance, and first-class widget support).
- Q: What should the home-screen widget show? → A: Two sizes — small (weather icon, current temperature, place name) and medium (small content plus today's high/low, rain chance, and the next few hours).
- Q: Which place should a widget show weather for? → A: Chosen per widget when it is added — a favorite, or "My location", which follows the device's live position (requires "allow all the time" location permission).
- Q: Should this feature cover only the Android app? → A: Yes. This feature is the Android app + widgets only; iOS becomes a separate follow-up feature referencing this spec.
- Q: When a new feature is added to the web app later, how quickly must the Android app get it? → A: Decided per feature — each new spec states whether Android is included now, later, or not at all; user-facing weather features default to "now".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the weather where I am, from an installed app (Priority: P1)

A user installs Tengmo Väder from Google Play, opens it, grants location permission, and immediately lands on the Overview for their current position — the same weather icons, today summary card, weekly strip, warnings, and companion character they would see in the web app.

**Why this priority**: This is the core value of the product. An installed app that only does this is already a usable release.

**Independent Test**: Install a fresh build on an Android phone, open it, allow location, and compare the Overview side-by-side with the web app for the same place and time.

**Acceptance Scenarios**:

1. **Given** a freshly installed app, **When** the user opens it for the first time, **Then** the app asks for location permission using the platform's own permission prompt, with a short explanation of why location is needed.
2. **Given** location permission is granted, **When** the app finishes loading, **Then** the Overview for the current position is shown with the same content and layout as the web app's Overview.
3. **Given** location permission is denied, **When** the app loads, **Then** the user sees the same "location unavailable" guidance as the web app and can still search for a place.
4. **Given** the app was used before, **When** the user reopens it, **Then** the last-viewed location is restored, as in the web app.

---

### User Story 2 - Explore graphs, details, and the map (Priority: P1)

From the Overview, the user opens the timeline graph, switches metric (temperature/rain/wind/cloud) and time window, opens the details table, and opens the map to view rain, temperature, or wind overlays — all with the same screens, controls, and "Home" behavior as the web app.

**Why this priority**: "Same functionality" means every existing view must be present; without these the app is a reduced product.

**Independent Test**: Walk through every view (Overview, Graph, Details, Map) and every control on each view and confirm each behaves as in the web app.

**Acceptance Scenarios**:

1. **Given** the Overview is shown, **When** the user opens Graph, Details, or Map, **Then** the corresponding view appears with the same content and controls as the web app.
2. **Given** any non-Overview view, **When** the user taps Home, **Then** the Overview is shown (matching the web app's rule that Home always means Overview).
3. **Given** the graph view, **When** the user drags or taps on the graph, **Then** values are inspectable with touch in the same way the web app supports on a phone browser.
4. **Given** any view other than the Overview, **When** the user uses the platform's back gesture/button (back button or back gesture), **Then** the app returns to the Overview instead of closing the app.
5. **Given** the Overview, **When** the user uses the Android back button, **Then** the app follows standard platform behavior (leaves the app).

---

### User Story 3 - Manage favorite places (Priority: P2)

The user searches for a place, saves it as a favorite (up to the same limit of 10 as the web app), switches between favorites and current position, and removes favorites.

**Why this priority**: Favorites are a main web-app feature and a key reason to install the app, but the app is still useful with current position only.

**Independent Test**: Search, add, switch, and remove favorites; force-close and reopen the app and confirm favorites persist.

**Acceptance Scenarios**:

1. **Given** fewer than 10 favorites, **When** the user saves a searched place, **Then** it appears in the favorites list and persists after the app is closed and reopened.
2. **Given** 10 favorites, **When** the user tries to add another, **Then** the same limit message as the web app is shown.
3. **Given** saved favorites, **When** the user selects one, **Then** the Overview for that place is shown.

---

### User Story 4 - Personalize the app (Priority: P2)

The user changes theme (Dark/Light), units (metric/imperial), language (auto/English/Swedish), nearby-station count, and high/low visibility. Choices take effect immediately and are remembered.

**Why this priority**: Preferences are part of the existing functionality but not required to deliver weather information.

**Independent Test**: Change every setting, close the app completely, reopen, and confirm each setting is still applied.

**Acceptance Scenarios**:

1. **Given** language is "auto", **When** the device language is Swedish, **Then** the app is shown in Swedish; otherwise in English.
2. **Given** any setting is changed, **When** the app is restarted, **Then** the setting is still in effect.
3. **Given** the Dark or Light theme is chosen, **When** the app is shown, **Then** the system status bar and navigation bar colors match the chosen theme so text and icons remain legible.

---

### User Story 5 - Keep weather fresh while the app is in use (Priority: P3)

The user leaves the app open or returns to it after some time; the data refreshes on the same schedule as the web app's periodic auto-refresh, and immediately when the app returns to the foreground if data is older than that interval.

**Why this priority**: Improves trust in the data, but the app is usable with manual reopening.

**Independent Test**: Put the app in the background longer than the refresh interval, bring it back, and confirm the "last updated" time moves forward without user action.

**Acceptance Scenarios**:

1. **Given** the app is in the foreground, **When** the refresh interval passes, **Then** data refreshes without disrupting the user's scroll position or current view.
2. **Given** the app has been in the background longer than the refresh interval, **When** the user returns to it, **Then** data refreshes automatically.
3. **Given** the device is offline, **When** the app is opened, **Then** the last successfully loaded data (if any) is shown with a clear "offline / last updated" indication, and it refreshes once connectivity returns.

---

### User Story 6 - Glance at the weather from the home screen (Priority: P2)

The user adds a Tengmo Väder widget (small or medium) to the home screen and chooses what it shows: one of their favorites, or "My location", which follows where the phone is. The widget stays current without opening the app, and tapping it opens the app on that place's Overview.

**Why this priority**: Widgets are one of the main reasons to install an app instead of using the web app, but the app itself delivers value without them.

**Independent Test**: Add a small and a medium widget, one set to a favorite and one to "My location"; leave the app closed for over an hour and move to another town; confirm both widgets update and open the right Overview when tapped.

**Acceptance Scenarios**:

1. **Given** the app is installed, **When** the user adds a widget, **Then** they are asked to choose a favorite or "My location".
2. **Given** the user picks "My location" without background location allowed, **When** setup continues, **Then** the app explains why "allow all the time" is needed and requests it; if it is declined, the widget uses the last known position.
3. **Given** a widget is on the home screen and the app is closed, **When** an hour passes, **Then** the widget shows refreshed weather and its last-updated time.
4. **Given** a "My location" widget with background location allowed, **When** the phone moves to another town, **Then** the widget shows the new place and its weather.
5. **Given** any widget, **When** the user taps it, **Then** the app opens on the Overview for the place that widget shows.
6. **Given** the user changes units, language, or theme in the app, **When** the widget next updates, **Then** it uses the new settings.

---

### Edge Cases

- Location permission granted "only this time" or "approximate location" only: the app uses the approximate position and behaves as for a normal position; it does not repeatedly prompt.
- Location permission later revoked in system settings: on next launch the app falls back to favorites/last-viewed place and shows the "location unavailable" guidance.
- Device location services turned off entirely: same as permission denied, with a hint to enable location services.
- Weather sources (SMHI, MET Norway, Open-Meteo) unavailable or slow: same fallback and "unavailable" states as the web app.
- Very small phones (e.g. 320 pt wide) and large phones/tablets: no content is cut off or overlaps; tablets show the phone layout scaled sensibly rather than a broken layout.
- Screen cut-outs (notch, dynamic island, rounded corners, gesture bar): no content or control is hidden behind them.
- Device font size set to largest accessibility size: text remains readable and controls remain reachable.
- Device rotated to landscape: layout remains usable (or the app stays in portrait).
- App opened for the first time with no network: a clear message is shown instead of an empty screen.
- User adds a "My location" widget but grants only "while using the app" location: the widget uses the position from the last time the app was open and shows how to allow background location.
- Device moves while offline: the "My location" widget keeps the last shown weather, marked with its last-updated time, until it can refresh.
- Battery-saver / power-restricted mode delays widget updates: the widget shows its last-updated time so stale data is recognizable.
- A user already using the web app installs the mobile app: favorites and settings are not transferred (see Assumptions); the app starts with defaults.

## Requirements *(mandatory)*

### Functional Requirements

**Platforms & distribution**

- **FR-001**: The product MUST be available as an installable app for Android phones, published through Google Play. (iOS is a separate follow-up feature.)
- **FR-001a**: The app MUST be a native Android app (built with the platform's own UI toolkit), not a wrapper around the web app, so it looks, scrolls, and responds like other apps on that platform while matching the web app's design.
- **FR-002**: The app MUST carry the Tengmo Väder name and the same app icon as the web app.
- **FR-003**: The existing web app MUST continue to work unchanged; the Android app is an additional channel, not a replacement.

**Functional parity**

- **FR-004**: The app MUST offer every user-facing capability the web app offers at the time of release: Overview (weather icons, today summary card, weekly forecast strip, companion character, sun/moon information, humidity, rain totals and rain chance, UV alerts), Graph (all metrics and time windows, nearby-station comparison, high/low markers), Details table, Map (rain, temperature, wind, and none overlays), severe-weather warnings (including collapsed informational warnings), place search, favorites, current-position weather, How-it-works information, and the privacy notice.
- **FR-005**: The app MUST use the same weather and geocoding data sources and the same source-selection/fallback rules as the web app, so that the same place at the same time shows the same values in both.
- **FR-006**: The app MUST offer the same settings as the web app (theme Dark/Light, units metric/imperial, language auto/English/Swedish, nearby-station count 0–4, high/low visibility) with the same defaults.
- **FR-007**: The app MUST persist favorites, settings, and the last-viewed location on the device across app restarts and device reboots.
- **FR-008**: The app MUST auto-refresh data on the same interval as the web app while in the foreground, and on returning to the foreground when data is older than that interval, without resetting the user's current view or scroll position.
- **FR-009**: The app MUST show all texts in English and Swedish using the same wording as the web app.
- **FR-010**: Each future feature specification MUST state whether it applies to the Android app now, later, or not at all. User-facing weather features default to "now" (built for web and Android in the same delivery); web-only details may be deferred or excluded when the spec says so.

**Look & feel parity**

- **FR-011**: Each screen MUST match the corresponding web-app screen as shown in a phone-width browser: same layout, order of sections, colors per theme, typography scale, weather icons, companion characters, and chart styling.
- **FR-012**: The app MUST respect platform safe areas (notches, cut-outs, status bar, home indicator / gesture bar) so no content or control is obscured.
- **FR-013**: The system status bar and navigation bar MUST follow the selected theme.
- **FR-014**: The app MUST support the platform back navigation (Android back button and back gesture) consistently with the app's "Home returns to Overview" rule.
- **FR-015**: The app MUST show a launch screen using the app icon and theme background while loading, rather than a blank white screen.

**Home-screen widgets**

- **FR-021**: The app MUST offer a small home-screen widget showing the current weather icon, current temperature, and place name.
- **FR-022**: The app MUST offer a medium home-screen widget showing the small widget's content plus today's high/low temperature, today's rain chance, and a strip of the next few hours (icon and temperature per hour).
- **FR-023**: Widgets MUST use the same weather icons, units, language, and theme colors as the app, following the user's in-app settings.
- **FR-024**: Tapping a widget MUST open the app on the Overview for the place the widget shows.
- **FR-025**: When adding a widget, the user MUST choose which place it shows: one of their favorites, or "My location". Each widget keeps its own choice, and the user MUST be able to change it later.
- **FR-026**: A "My location" widget MUST follow the device's current position, updating its place and weather when the device has moved noticeably (for example to another town), even while the app is closed.
- **FR-027**: The app MUST ask for "allow all the time" (background) location only when the user sets up a "My location" widget, with a clear explanation of why; it MUST NOT be requested at first launch or for any other reason.
- **FR-028**: If background location is denied or later revoked, a "My location" widget MUST keep showing the last known position, clearly marked with the place name, and offer a way to grant the permission; the rest of the app is unaffected.
- **FR-029**: Widgets MUST refresh their weather periodically while the app is closed, at a frequency that keeps data no older than about one hour without noticeably draining the battery.
- **FR-030**: If a widget's favorite is removed in the app, the widget MUST show a clear "place removed — tap to choose another" state instead of stale data.

**Platform integration**

- **FR-016**: The app MUST request location permission through the platform's native permission prompt, with a purpose text explaining that location is used only to show local weather.
- **FR-017**: The app MUST work with approximate/coarse location if the user grants only that.
- **FR-018**: The app MUST keep the web app's privacy posture: no user account, no sign-in, no personal data sent to any server of ours, no advertising, no tracking/analytics identifiers; location (including background location used by "My location" widgets) is only sent, as coordinates, to the weather/geocoding data sources and is never stored off the device or used for any other purpose.
- **FR-019**: The app MUST provide the privacy information required by each store (privacy policy link and data-use declarations) consistent with FR-018.
- **FR-020**: When offline, the app MUST show the most recently loaded data for the selected location (if any) with a visible "last updated" time and an offline indication.

**Out of scope for this feature** (may be specified separately later)

- Push notifications (e.g., for severe-weather warnings).
- The iOS app (separate follow-up feature).
- Watch apps and lock-screen widgets.
- Background location or background refresh for anything other than home-screen widgets.
- Syncing favorites/settings between the web app and the Android app, or between devices.
- Tablet-specific layouts beyond a sensible, non-broken presentation of the phone layout.

### Key Entities

- **Location**: A place the user views weather for — either the current device position or a saved favorite; has a display name and coordinates. Same meaning as in the web app.
- **Favorite**: A saved Location, max 10 per device, stored on the device only.
- **User Preferences**: Theme, units, language, nearby-station count, high/low visibility, and last-viewed location; stored on the device only.
- **Cached Weather Snapshot**: The last successfully loaded weather data for the selected location, with its load time, used for offline display.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The app is approved and publicly downloadable from Google Play.
- **SC-002**: 100% of the web app's user-facing features (per a feature parity checklist derived from FR-004 and FR-006) are present and working in the Android app at release.
- **SC-003**: For the same location and time, the values shown (temperature, rain, wind, cloud, warnings, forecast) in the app and the web app are identical in 100% of a sample of at least 10 locations (Swedish and non-Swedish).
- **SC-004**: In a side-by-side review of each screen in both themes, reviewers judge the app screens as visually matching the web app on a phone browser for every screen.
- **SC-005**: On a mid-range phone with a normal mobile connection, the Overview for the current position is visible within 3 seconds of launching the app (after permission has been granted once).
- **SC-006**: A first-time user can go from opening the app to seeing their local weather in under 30 seconds, including the permission prompt.
- **SC-007**: No content or controls are obscured or cut off on the smallest and largest supported Android phone screen sizes, including with the largest accessibility font size.
- **SC-008**: Favorites and settings survive app restart and device reboot in 100% of test runs.
- **SC-009**: The app crash in fewer than 1% of user sessions during the first month after release.
- **SC-010**: Widget data is never older than 90 minutes while the device has connectivity and is not in a power-restricted mode.
- **SC-011**: After the device moves to a different town, a "My location" widget shows the new place within 30 minutes (with background location allowed).
- **SC-012**: The widgets add less than 2% daily battery use on a typical phone.

## Assumptions

- "Same functionality and GUI" means parity with the web app as currently shown in a phone-width browser; the phone layout of the web app is the design reference.
- Supported versions: the Android versions still receiving security updates at release time (roughly the latest 4–5 major versions); phones are the primary target, tablets are supported only in the sense of not breaking.
- The app are free to download, have no in-app purchases, and are published under the owner's Google Play developer account, which the owner will set up and pay for.
- Favorites and settings are stored per device; there is no migration from the web app's browser storage.
- The public weather data sources used by the web app (SMHI, MET Norway, Open-Meteo, and their map/overlay data) permit use from mobile apps under the same attribution terms; attributions shown in the web app are also shown in the app.
- The map continues to use the app's own map rendering with data overlays, not an embedded third-party weather site.
- The internal debug panel is kept only in non-store (development/test) builds.
- Background location use for "My location" widgets requires an extra store declaration (Google Play's background-location review); the owner will supply the required explanation and demo material.
- Store listing texts and screenshots are provided in English and Swedish.
- Orientation: portrait is the primary orientation on phones; landscape support is optional.
