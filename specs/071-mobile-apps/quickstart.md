# Quickstart: Validating the Tengmo Väder Android App

This is a validation guide, not a build guide — it assumes the app has already been built per the implementation phase's tasks. Use it to confirm the feature works end-to-end, mapped to [spec.md](spec.md)'s user stories and success criteria.

## Prerequisites

- An Android device or emulator running one of the supported OS versions (spec.md Assumptions: roughly the latest 4–5 major Android versions).
- A debug build of the app installed (`adb install`), or an internal-testing track release from Google Play.
- Network connectivity (Wi-Fi or mobile data) for the initial checks; airplane mode toggle available for the offline checks.
- At least one location inside SMHI coverage (e.g. Stockholm) and one outside it (e.g. a non-Swedish city) to exercise both data-source paths (research.md §5).

## US1 — First launch & current location (P1)

1. Install and open the app fresh (clear app data if reinstalling).
2. Confirm the OS location permission dialog appears with the purpose text from FR-016.
3. Grant location → confirm the Overview appears for the current position within ~3 seconds on a normal connection (SC-005), matching the web app's Overview for the same coordinates (open the web app side-by-side at the same phone width).
4. Force-close and reopen the app → confirm the last-viewed location is restored without re-prompting for permission.
5. Deny location on a fresh install → confirm the "location unavailable" guidance appears and place search still works.

## US2 — Graph, Details, Map (P1)

1. From the Overview, open Graph → switch between all four metrics and all applicable time windows; compare each against the web app.
2. Toggle high/low visibility and nearby-station count (0–4) → confirm nearby comparison series appear/disappear accordingly.
3. Open Details → confirm the table matches the web app's for the same window.
4. Open Map → cycle through Rain / Temperature / Wind / None overlays; confirm the map is native (no embedded third-party site).
5. From any non-Overview view, use the system back gesture/button → confirm it returns to the Overview (not to the previous app or home screen), and that Home from the Overview follows normal Android back behavior (FR-014, US2 scenario 5).

## US3 — Favorites (P2)

1. Search for a place, save it as a favorite; force-close and reopen the app → confirm it persists.
2. Add favorites up to 10, then attempt an 11th → confirm the limit message matches the web app's wording.
3. Select a favorite → confirm the Overview switches to it.

## US4 — Settings (P2)

1. Set language to "auto" with the device set to Swedish, then to a non-Swedish language → confirm the app follows the device language in the first case and falls back to English otherwise.
2. Change theme, units, nearby-station count, and high/low visibility one at a time; restart the app after each → confirm every setting persisted.
3. Switch theme → confirm the status bar and navigation bar colors update to match (FR-013).

## US5 — Auto-refresh & offline (P3)

1. Leave the app open past the refresh interval → confirm data refreshes without losing scroll position.
2. Background the app past the refresh interval, then return → confirm an automatic refresh occurs.
3. Enable airplane mode, reopen the app → confirm the last successfully loaded data shows with a visible "last updated"/offline indicator; disable airplane mode → confirm it refreshes.

## US6 — Widgets (P2)

1. Add a small widget → choose a favorite as its target → confirm it shows icon, temperature, and place name matching the app.
2. Add a medium widget → choose "My location" → confirm the background-location explanation and prompt appear (only now, not at first app launch), and that declining leaves the widget showing the last known position.
3. With both widgets present, change theme/units/language in the app → confirm each widget reflects the change on its next redraw.
4. Leave both widgets untouched for over an hour with the app closed → confirm each still shows data no older than ~90 minutes (SC-010), with a visible last-updated time if a refresh hasn't happened yet.
5. With background location granted, simulate/travel to a different town (or use a mock-location tool on a test device) → confirm the "My location" widget updates to the new place within 30 minutes (SC-011).
6. Delete the favorite a widget targets → confirm that widget shows the "place removed — tap to choose another" state (FR-030).
7. Tap each widget → confirm the app opens directly on that widget's Overview.

## Cross-cutting checks

- **Look & feel parity (FR-011)**: for each screen above, compare against the web app opened at phone width, in both Dark and Light theme.
- **Safe areas (FR-012)**: run on a device with a notch/cutout and one with on-screen gesture navigation; confirm nothing is obscured.
- **Accessibility (SC-007)**: set the device to its largest font size; re-run US1–US4 and confirm no clipped or unreachable content.
- **Data parity (SC-003)**: for the same location/time, compare temperature, rain, wind, cloud, warnings, and forecast values shown in the app vs. the web app across at least 10 locations (mix of SMHI-covered and fallback).
- **Battery (SC-012)**: run the device with both widgets installed for 24h under normal use and check battery usage attribution in system settings.
- **Crash rate (SC-009)**: monitored via Play Console's built-in crash/ANR reporting (research.md §10) over the first month post-release, not a single quickstart pass.

## Contracts referenced

- [contracts/weather-data-sources.md](contracts/weather-data-sources.md) — which data source answers each request.
- [contracts/widget-app-interface.md](contracts/widget-app-interface.md) — how widgets get their data and open the app.
