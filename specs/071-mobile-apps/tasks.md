---

description: "Task list template for feature implementation"
---

# Tasks: Tengmo Väder Android App

**Input**: Design documents from `/specs/071-mobile-apps/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Not explicitly requested in the spec; no dedicated per-story test tasks are included. Setup still configures the test frameworks named in plan.md's Technical Context, and Polish includes a manual quickstart.md validation pass plus a couple of high-value automated checks (source-selection parity, aggregation) since spec.md's SC-003 depends on them behaving identically to the web app.

**Organization**: Tasks are grouped by user story (spec.md US1–US6) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- File paths are relative to the repository root; `android/app/src/main/kotlin/com/tengmo/vader/` is abbreviated below as `…/` for readability once introduced in each section.

## Path Conventions

Per plan.md's Project Structure: a new `android/` Gradle project sibling to the existing `src/` web app. Kotlin sources live under `android/app/src/main/kotlin/com/tengmo/vader/`; resources under `android/app/src/main/res/`; unit tests under `android/app/src/test/kotlin/com/tengmo/vader/`; instrumented tests under `android/app/src/androidTest/kotlin/com/tengmo/vader/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the Android project and its build/tooling scaffolding. Nothing here is user-story-specific.

- [X] T001 Create the `android/` Gradle project (Gradle Kotlin DSL) with an `app` module targeting the compileSdk/minSdk/targetSdk decided in research.md §11, in `android/settings.gradle.kts` and `android/app/build.gradle.kts`
- [X] T002 Add Compose, Glance, WorkManager, Play Services Location, DataStore, and networking (Ktor Client or Retrofit) dependencies to `android/app/build.gradle.kts` per research.md §1–6
- [X] T003 [P] Configure Kotlin lint/formatting (ktlint or detekt) for the `android/` module in `android/build.gradle.kts`
- [X] T004 [P] Create the package skeleton (empty directories with a placeholder file each) under `android/app/src/main/kotlin/com/tengmo/vader/{ui/overview,ui/graph,ui/details,ui/map,ui/favorites,ui/settings,widget,data/model,data/source,data/repository,data/local,location,work,theme}` per plan.md's Project Structure
- [X] T005 [P] Add the app icon and adaptive-icon assets (matching the web app's icon, FR-002) to `android/app/src/main/res/mipmap-*`
- [X] T006 [P] Register the app manifest (`android/app/src/main/AndroidManifest.xml`) with the app name "Tengmo Väder", required permissions placeholders (`ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION`/`ACCESS_BACKGROUND_LOCATION`/`INTERNET`), and a launch theme showing the app icon over the theme background (FR-015)

**Checkpoint**: Project builds and installs an empty app shell.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain models, data sourcing, persistence, theming, and navigation shell every user story needs. **No user story work can begin until this phase is complete.**

### Domain models (data-model.md)

- [X] T007 [P] Create `Location`, `LocationSource`, `Favorite` in `android/app/src/main/kotlin/com/tengmo/vader/data/model/Location.kt`
- [X] T008 [P] Create `WeatherObservation`, `ObservationSeries`, `ObservationWindow`, `ObservationStatus` in `android/app/src/main/kotlin/com/tengmo/vader/data/model/Observation.kt`
- [X] T009 [P] Create `DailyAggregate` in `android/app/src/main/kotlin/com/tengmo/vader/data/model/DailyAggregate.kt`
- [X] T010 [P] Create `StationInfo`, `NearbyStationSeries` in `android/app/src/main/kotlin/com/tengmo/vader/data/model/Station.kt`
- [X] T011 [P] Create `WeatherWarning` in `android/app/src/main/kotlin/com/tengmo/vader/data/model/WeatherWarning.kt`
- [X] T012 [P] Create `UserPreferences`, `Theme`, `UnitSystem`, `LanguagePreference`, `WeatherMetric`, `NearbyStationCount`, `HighLowVisibility` (with the same defaults as web's `types.ts`) in `android/app/src/main/kotlin/com/tengmo/vader/data/model/UserPreferences.kt`
- [X] T013 [P] Create `Widget`, `WidgetTarget`, `CachedWeatherSnapshot` in `android/app/src/main/kotlin/com/tengmo/vader/data/model/Widget.kt`

### Data sourcing (contracts/weather-data-sources.md, research.md §5)

- [X] T014 [P] Implement the SMHI API client (observations, forecast, warnings, UV/STRÅNG endpoints from contracts/weather-data-sources.md) in `android/app/src/main/kotlin/com/tengmo/vader/data/source/SmhiSource.kt`
- [X] T015 [P] Implement the Open-Meteo API client (forecast/observations + geocoding) in `android/app/src/main/kotlin/com/tengmo/vader/data/source/OpenMeteoSource.kt`
- [X] T016 [P] Implement the MET Norway forecast client in `android/app/src/main/kotlin/com/tengmo/vader/data/source/MetNoSource.kt`
- [X] T017 [P] Implement the Nominatim reverse-geocoding client in `android/app/src/main/kotlin/com/tengmo/vader/data/source/NominatimSource.kt`
- [X] T018 Implement the SMHI-coverage polygon check in `android/app/src/main/kotlin/com/tengmo/vader/data/source/SmhiCoverage.kt` (depends on T014)
- [X] T019 Implement `WeatherRepository` applying the source-selection contract (SMHI first when covered, Open-Meteo fallback and forecast-only merge, warnings/UV gated on coverage) in `android/app/src/main/kotlin/com/tengmo/vader/data/repository/WeatherRepository.kt` (depends on T014-T018)
- [X] T020 Implement daily/rolling-24h aggregation (mirroring web's `dailyAggregation.ts`, including daytime-only fields) in `android/app/src/main/kotlin/com/tengmo/vader/data/repository/DailyAggregation.kt` (depends on T008, T009)

### Persistence (research.md §6)

- [X] T021 [P] Implement DataStore-backed favorites storage (max 10, FR-006) in `android/app/src/main/kotlin/com/tengmo/vader/data/local/FavoritesStore.kt`
- [X] T022 [P] Implement DataStore-backed user preferences storage (with defaults from T012) in `android/app/src/main/kotlin/com/tengmo/vader/data/local/PreferencesStore.kt`
- [X] T023 [P] Implement on-disk cached-weather-snapshot storage (FR-020, FR-029) in `android/app/src/main/kotlin/com/tengmo/vader/data/local/SnapshotStore.kt`

### Theming, localization, navigation shell

- [X] T024 [P] Port the web app's Midnight/Ivory color tokens and typography scale into a Compose theme in `android/app/src/main/kotlin/com/tengmo/vader/theme/AppTheme.kt` (FR-011, FR-013)
- [X] T025 [P] Port `src/i18n/en.ts` strings into `android/app/src/main/res/values/strings.xml`
- [X] T026 [P] Port `src/i18n/sv.ts` strings into `android/app/src/main/res/values-sv/strings.xml`
- [X] T027 Implement the language-preference resolver (auto/en/sv, following device locale for "auto") in `android/app/src/main/kotlin/com/tengmo/vader/data/repository/LanguageResolver.kt` (depends on T022)
- [X] T028 Implement the top-level navigation host (Overview/Graph/Details/Map + "Home always returns to Overview" + system back handling, FR-014) in `android/app/src/main/kotlin/com/tengmo/vader/ui/AppNavHost.kt` (depends on T024)
- [X] T029 Implement the main `Activity`/entry point wiring the nav host, theme, and launch screen in `android/app/src/main/kotlin/com/tengmo/vader/MainActivity.kt` (depends on T028)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - See the weather where I am, from an installed app (Priority: P1) 🎯 MVP

**Goal**: Fresh install → grant location → Overview for current position, matching the web app's content and layout; graceful denial and restore-last-location behavior.

**Independent Test**: Install a fresh build, open it, allow location, and compare the Overview side-by-side with the web app for the same place and time (quickstart.md US1).

### Implementation for User Story 1

- [X] T030 [P] [US1] Implement the foreground location permission request flow (with FR-016 purpose text) in `android/app/src/main/kotlin/com/tengmo/vader/location/LocationPermissionFlow.kt`
- [X] T031 [US1] Implement current-position resolution via `FusedLocationProviderClient` (foreground only, coarse-location tolerant per FR-017) in `android/app/src/main/kotlin/com/tengmo/vader/location/CurrentLocationProvider.kt` (depends on T030)
- [X] T032 [US1] Implement last-viewed-location restore and current-position sync (mirroring web's `App.tsx` effects) in `android/app/src/main/kotlin/com/tengmo/vader/ui/overview/OverviewViewModel.kt` (depends on T019, T021, T022, T031)
- [X] T033 [P] [US1] Build the today-summary card composable (condition, temperature, sun/moon, humidity, rain total/chance) in `android/app/src/main/kotlin/com/tengmo/vader/ui/overview/TodaySummaryCard.kt`
- [X] T034 [P] [US1] Build the weekly-forecast-strip composable in `android/app/src/main/kotlin/com/tengmo/vader/ui/overview/WeeklyForecastStrip.kt`
- [X] T035 [P] [US1] Build the weather-icon and companion-character composables (porting the web app's icon/character selection logic) in `android/app/src/main/kotlin/com/tengmo/vader/ui/overview/WeatherIcons.kt`
- [X] T036 [P] [US1] Build the UV-alert and severe-weather warning banner composables in `android/app/src/main/kotlin/com/tengmo/vader/ui/overview/WarningBanner.kt`
- [X] T037 [US1] Assemble the Overview screen from T033–T036 bound to `OverviewViewModel` in `android/app/src/main/kotlin/com/tengmo/vader/ui/overview/OverviewScreen.kt` (depends on T032-T036)
- [X] T038 [US1] Implement the "location unavailable" guidance state (denied/unavailable, still allows search) in `android/app/src/main/kotlin/com/tengmo/vader/ui/overview/LocationUnavailableView.kt` (depends on T032)
- [X] T039 [US1] Implement the launch screen (app icon over theme background while loading, FR-015) in `android/app/src/main/kotlin/com/tengmo/vader/ui/LaunchScreen.kt`

**Checkpoint**: User Story 1 is fully functional and independently testable — the app can be demoed on the Overview alone.

---

## Phase 4: User Story 2 - Explore graphs, details, and the map (Priority: P1)

**Goal**: Graph (all metrics/windows, nearby-station comparison, high/low markers), Details table, and Map (rain/temperature/wind/none overlays), all reachable from the Overview and returning to it via Home/back.

**Independent Test**: Walk through every view and every control on each view and confirm each behaves as in the web app (quickstart.md US2).

### Implementation for User Story 2

- [X] T040 [P] [US2] Build the Compose chart component (metric switch, time-window switch, forecast-vs-observed styling, touch-drag inspection, high/low markers per research.md §7) in `android/app/src/main/kotlin/com/tengmo/vader/ui/graph/ObservationChart.kt`
- [X] T041 [US2] Implement `GraphViewModel` wiring `WeatherRepository`, nearby-station comparison (gated on `nearbyStationCount` and on Graph having been opened, mirroring web's `hasOpenedDetails`), and high/low visibility in `android/app/src/main/kotlin/com/tengmo/vader/ui/graph/GraphViewModel.kt` (depends on T019, T022)
- [X] T042 [US2] Assemble the Graph screen (chart + metric/window controls + nearby-station toggle) in `android/app/src/main/kotlin/com/tengmo/vader/ui/graph/GraphScreen.kt` (depends on T040, T041)
- [X] T043 [US2] Implement the Details table screen in `android/app/src/main/kotlin/com/tengmo/vader/ui/details/DetailsScreen.kt` (depends on T019)
- [X] T044 [P] [US2] Implement the native map surface with the OSM tile base layer in `android/app/src/main/kotlin/com/tengmo/vader/ui/map/MapSurface.kt` (research.md §8)
- [X] T045 [US2] Implement the rain/temperature/wind/none overlay data loading and rendering in `android/app/src/main/kotlin/com/tengmo/vader/ui/map/MapOverlays.kt` (depends on T019, T044)
- [X] T046 [US2] Assemble the Map screen with the overlay picker in `android/app/src/main/kotlin/com/tengmo/vader/ui/map/MapScreen.kt` (depends on T044, T045)
- [X] T047 [US2] Wire Graph/Details/Map into `AppNavHost` with Home-returns-to-Overview and system back behavior (FR-014) in `android/app/src/main/kotlin/com/tengmo/vader/ui/AppNavHost.kt` (depends on T028, T037, T042, T043, T046)

**Checkpoint**: User Stories 1 and 2 both work independently — full Overview/Graph/Details/Map parity.

---

## Phase 5: User Story 3 - Manage favorite places (Priority: P2)

**Goal**: Search, save (max 10), switch, and remove favorites, persisted across restarts.

**Independent Test**: Search, add, switch, and remove favorites; force-close and reopen the app and confirm favorites persist (quickstart.md US3).

### Implementation for User Story 3

- [X] T048 [P] [US3] Implement place search against Open-Meteo geocoding in `android/app/src/main/kotlin/com/tengmo/vader/ui/favorites/PlaceSearchViewModel.kt` (depends on T015)
- [X] T049 [P] [US3] Build the place-search composable (results list, empty/error states) in `android/app/src/main/kotlin/com/tengmo/vader/ui/favorites/PlaceSearchView.kt`
- [X] T050 [US3] Implement `FavoritesViewModel` (add with limit message, remove, select) in `android/app/src/main/kotlin/com/tengmo/vader/ui/favorites/FavoritesViewModel.kt` (depends on T021)
- [X] T051 [US3] Build the favorites list composable (switch/remove, 10-item limit message) in `android/app/src/main/kotlin/com/tengmo/vader/ui/favorites/FavoritesList.kt` (depends on T050)
- [X] T052 [US3] Wire favorites/search into the Overview's location switcher entry point in `android/app/src/main/kotlin/com/tengmo/vader/ui/overview/OverviewScreen.kt` (depends on T037, T049, T051)

**Checkpoint**: Favorites are fully usable alongside US1/US2.

---

## Phase 6: User Story 4 - Personalize the app (Priority: P2)

**Goal**: Theme, units, language, nearby-station count, and high/low visibility — changeable, immediate, and persisted; system bars follow theme.

**Independent Test**: Change every setting, close the app completely, reopen, and confirm each setting is still applied (quickstart.md US4).

### Implementation for User Story 4

- [X] T053 [US4] Implement `SettingsViewModel` reading/writing `PreferencesStore` for all five settings in `android/app/src/main/kotlin/com/tengmo/vader/ui/settings/SettingsViewModel.kt` (depends on T022, T027)
- [X] T054 [US4] Build the Settings screen composable (theme/units/language/nearby-station-count/high-low controls) in `android/app/src/main/kotlin/com/tengmo/vader/ui/settings/SettingsScreen.kt` (depends on T053)
- [X] T055 [US4] Implement status-bar/navigation-bar color sync with the selected theme (FR-013) in `android/app/src/main/kotlin/com/tengmo/vader/theme/SystemBarsController.kt` (depends on T024, T053)
- [X] T056 [US4] Wire Settings into `AppNavHost` and the Overview's settings entry point in `android/app/src/main/kotlin/com/tengmo/vader/ui/AppNavHost.kt` (depends on T028, T054)

**Checkpoint**: Personalization is fully usable alongside US1–US3.

---

## Phase 7: User Story 5 - Keep weather fresh while the app is in use (Priority: P3)

**Goal**: Foreground periodic refresh without disrupting view/scroll state; refresh on foreground-return past the interval; offline shows last-loaded data with a clear indicator.

**Independent Test**: Put the app in the background longer than the refresh interval, bring it back, and confirm the "last updated" time moves forward without user action (quickstart.md US5).

### Implementation for User Story 5

- [X] T057 [US5] Implement the in-foreground periodic refresh timer (matching web's `REFRESH_INTERVAL_MS`) and refresh-on-resume-if-stale logic, without resetting the active view/scroll position, in `android/app/src/main/kotlin/com/tengmo/vader/ui/overview/RefreshCoordinator.kt` (depends on T019, T032)
- [X] T058 [US5] Implement connectivity/offline detection and the "last updated + offline" indicator in `android/app/src/main/kotlin/com/tengmo/vader/ui/OfflineIndicator.kt` (depends on T023)
- [X] T059 [US5] Wire `RefreshCoordinator` and `OfflineIndicator` into the Overview, Graph, and Details screens in `android/app/src/main/kotlin/com/tengmo/vader/ui/overview/OverviewScreen.kt`, `android/app/src/main/kotlin/com/tengmo/vader/ui/graph/GraphScreen.kt`, `android/app/src/main/kotlin/com/tengmo/vader/ui/details/DetailsScreen.kt` (depends on T037, T042, T043, T057, T058)

**Checkpoint**: Data freshness and offline handling complete across all screens.

---

## Phase 8: User Story 6 - Glance at the weather from the home screen (Priority: P2)

**Goal**: Small and medium widgets, per-widget favorite/"My location" targeting, background-location-gated live-position tracking, periodic background refresh, tap-to-open, and graceful removed-favorite/denied-permission states.

**Independent Test**: Add a small and a medium widget, one set to a favorite and one to "My location"; leave the app closed for over an hour and move to another town; confirm both widgets update and open the right Overview when tapped (quickstart.md US6).

### Implementation for User Story 6

- [X] T060 [P] [US6] Implement the staged background-location request flow (foreground granted first, then "allow all the time" with explanation, triggered only from widget setup, FR-027) in `android/app/src/main/kotlin/com/tengmo/vader/location/BackgroundLocationFlow.kt`
- [X] T061 [US6] Implement significant-location-change tracking (large-displacement, low-frequency, research.md §3) in `android/app/src/main/kotlin/com/tengmo/vader/location/SignificantLocationTracker.kt` (depends on T060)
- [X] T062 [P] [US6] Implement `WidgetTargetStore` (per-widget target persistence, favorite/My-location, FR-025) in `android/app/src/main/kotlin/com/tengmo/vader/data/local/WidgetTargetStore.kt`
- [X] T063 [US6] Implement the widget-configuration activity (choose favorite or "My location"; triggers T060 when "My location" is picked) in `android/app/src/main/kotlin/com/tengmo/vader/widget/WidgetConfigureActivity.kt` (depends on T021, T060, T062)
- [X] T064 [P] [US6] Build the small Glance widget composable (icon, temperature, place name) in `android/app/src/main/kotlin/com/tengmo/vader/widget/SmallWeatherWidget.kt` (depends on T024)
- [X] T065 [P] [US6] Build the medium Glance widget composable (small content + high/low, rain chance, next-hours strip) in `android/app/src/main/kotlin/com/tengmo/vader/widget/MediumWeatherWidget.kt` (depends on T024)
- [X] T066 [US6] Implement the "place removed" and "permission needed" widget states (FR-028, FR-030) in `android/app/src/main/kotlin/com/tengmo/vader/widget/WidgetErrorStates.kt` (depends on T062, T064, T065)
- [X] T067 [US6] Implement the WorkManager periodic widget-refresh job (writing `CachedWeatherSnapshot` via `WeatherRepository` and triggering a Glance redraw, research.md §4) in `android/app/src/main/kotlin/com/tengmo/vader/work/WidgetRefreshWorker.kt` (depends on T019, T023, T062)
- [X] T068 [US6] Implement the expedited refresh trigger fired from `SignificantLocationTracker` (research.md §4) in `android/app/src/main/kotlin/com/tengmo/vader/work/LocationChangeRefreshTrigger.kt` (depends on T061, T067)
- [X] T069 [US6] Implement widget-tap deep link opening `MainActivity` on the Overview for the widget's resolved location (FR-024) in `android/app/src/main/kotlin/com/tengmo/vader/widget/WidgetTapHandler.kt` (depends on T029, T062)
- [X] T070 [US6] Register both widget receivers, the configuration activity, and the tap deep link in `android/app/src/main/AndroidManifest.xml` (depends on T063, T064, T065, T069)

**Checkpoint**: All six user stories are independently functional. Full feature parity plus widgets is complete.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Store readiness, privacy/accessibility compliance, and validation that cuts across all stories.

- [X] T071 [P] Add the privacy policy link and store data-use declarations content consistent with FR-018/FR-019 to `android/app/src/main/kotlin/com/tengmo/vader/ui/settings/PrivacyNoticeScreen.kt`
- [X] T072 [P] Add SMHI/Open-Meteo attribution content (matching the web app's footer) to `android/app/src/main/kotlin/com/tengmo/vader/ui/AttributionView.kt`
- [X] T073 [P] Audit and adjust safe-area (notch/cutout/status bar/gesture bar) insets across Overview/Graph/Details/Map/Settings screens for FR-012
- [X] T074 [P] Audit and adjust all screens at the largest accessibility font size for SC-007
- [X] T075 [P] Add a unit test verifying the SMHI-first/Open-Meteo-fallback source-selection order in `android/app/src/test/kotlin/com/tengmo/vader/data/repository/WeatherRepositorySourceSelectionTest.kt` (depends on T019)
- [X] T076 [P] Add a unit test verifying daily/rolling-24h aggregation matches expected buckets in `android/app/src/test/kotlin/com/tengmo/vader/data/repository/DailyAggregationTest.kt` (depends on T020)
- [X] T077 Configure Play Console's built-in crash/ANR reporting (no added SDK, research.md §10) for the release build variant in `android/app/build.gradle.kts`
- [ ] T078 Run the full [quickstart.md](quickstart.md) validation pass (all six user stories plus cross-cutting checks) against a release-candidate build

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–8)**: All depend on Foundational completion.
  - US1 and US2 are both P1 and share no code beyond the nav host (T028/T047) — can proceed in parallel once Foundational is done, though US2's screens are more useful once US1 establishes the Overview entry point.
  - US3 (favorites) and US4 (settings) are independent of each other and of US2's Graph/Map internals, but both extend the Overview built in US1.
  - US5 (refresh/offline) wires into screens built by US1/US2, so it is easiest once those exist.
  - US6 (widgets) depends on the repository/persistence from Foundational and on favorites (US3) for the "choose a favorite" widget target, but not on US2, US4, or US5.
- **Polish (Phase 9)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Foundational only.
- **US2 (P1)**: Foundational only; shares the nav host with US1 (T028/T047).
- **US3 (P2)**: Foundational only; extends US1's Overview (T052 touches T037).
- **US4 (P2)**: Foundational only; extends US1's Overview/nav host (T056 touches T028).
- **US5 (P3)**: Foundational + benefits from US1/US2's screens existing (T059 touches T037/T042/T043).
- **US6 (P2)**: Foundational + US3 (favorites, for widget target selection, T063 depends on T021 from Foundational and reads favorites from US3's store).

### Within Each User Story

- Location/data/persistence tasks before ViewModels.
- ViewModels before the composables/screens that bind to them.
- Individual screens before their wiring into `AppNavHost`.

### Parallel Opportunities

- All Setup tasks marked [P] (T003–T006) can run in parallel after T001–T002.
- All domain-model tasks in Foundational (T007–T013) can run in parallel.
- All four data-source clients (T014–T017) can run in parallel; T018–T020 depend on them.
- The three persistence stores (T021–T023) can run in parallel.
- Theming/localization tasks (T024–T026) can run in parallel.
- Within US1: T033–T036 (card/strip/icons/banner composables) can run in parallel once T032 exists.
- Within US2: T040 and T044 (chart and map surface) can run in parallel.
- Within US3: T048–T049 (search) can run in parallel with each other; independent of T050–T051 until T052.
- Within US6: T060/T062/T064/T065 can run in parallel; T067–T070 depend on earlier US6 tasks.
- Most of Polish (T071–T076) can run in parallel.

---

## Parallel Example: Foundational Phase

```bash
# Launch all domain models together:
Task: "Create Location, LocationSource, Favorite in android/app/src/main/kotlin/com/tengmo/vader/data/model/Location.kt"
Task: "Create WeatherObservation, ObservationSeries, ObservationWindow, ObservationStatus in .../data/model/Observation.kt"
Task: "Create DailyAggregate in .../data/model/DailyAggregate.kt"
Task: "Create StationInfo, NearbyStationSeries in .../data/model/Station.kt"
Task: "Create WeatherWarning in .../data/model/WeatherWarning.kt"
Task: "Create UserPreferences, Theme, UnitSystem, LanguagePreference, WeatherMetric, NearbyStationCount, HighLowVisibility in .../data/model/UserPreferences.kt"
Task: "Create Widget, WidgetTarget, CachedWeatherSnapshot in .../data/model/Widget.kt"

# Launch all four data-source clients together:
Task: "Implement the SMHI API client in .../data/source/SmhiSource.kt"
Task: "Implement the Open-Meteo API client in .../data/source/OpenMeteoSource.kt"
Task: "Implement the MET Norway forecast client in .../data/source/MetNoSource.kt"
Task: "Implement the Nominatim reverse-geocoding client in .../data/source/NominatimSource.kt"
```

## Parallel Example: User Story 1

```bash
# Once OverviewViewModel (T032) exists, launch all four Overview composables together:
Task: "Build the today-summary card composable in .../ui/overview/TodaySummaryCard.kt"
Task: "Build the weekly-forecast-strip composable in .../ui/overview/WeeklyForecastStrip.kt"
Task: "Build the weather-icon and companion-character composables in .../ui/overview/WeatherIcons.kt"
Task: "Build the UV-alert and severe-weather warning banner composables in .../ui/overview/WarningBanner.kt"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md's US1 section
5. Demo: install-and-see-current-weather is already a usable release

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add US1 → validate → MVP demo
3. Add US2 (Graph/Details/Map) → validate → full-parity demo
4. Add US3 (Favorites) and US4 (Settings) → validate → personalizable, multi-place demo
5. Add US5 (freshness/offline) → validate → production-grade data behavior
6. Add US6 (Widgets) → validate → release-candidate build, ready for Phase 9 Polish and Google Play submission

### Suggested Team Split (if staffed)

- Developer A: Foundational data layer (T007–T023), then US1, then US5.
- Developer B: Theming/nav shell (T024–T029), then US2 (Graph/Details/Map), then Polish's screen-level items.
- Developer C: US3 (Favorites) then US6 (Widgets), since US6 depends on favorites existing.
- All converge on Phase 9 Polish before submission.

---

## Implementation status (2026-09-27)

- T001–T077 implemented; the app compiles, all 10 unit tests pass, and the debug APK builds.
- **Verified on an emulator (API 34):** launch, denied/unavailable location guidance, place search, live SMHI data on the Overview (icons, companion character, sun/moon, warnings, hourly + 7-day strips), Graph (observed vs forecast, now marker), Map (OSM + radar + pin), safe-area padding, theme contrast.
- **Implemented and compiled but NOT exercised at runtime:** the home-screen widgets and their background work/location flow (T060–T070), settings persistence/language switching, offline cache, Details, favorites limit. These need a device or a launcher-driven emulator session.
- **T078 left open:** the full quickstart.md pass includes checks that need real time or a real device (widget freshness over 1–2 hours, moving between towns, 24 h battery, crash rate).

## Notes

- [P] tasks = different files, no dependencies on incomplete work.
- [Story] label maps each task to its spec.md user story for traceability.
- No automated test tasks are included per story (tests weren't explicitly requested); quickstart.md (T078) is the acceptance mechanism, supplemented by two targeted unit tests (T075–T076) covering the logic SC-003's data-parity claim depends on.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
- Avoid: vague tasks, same-file conflicts within a parallel batch, and cross-story dependencies that would break independent testability.
