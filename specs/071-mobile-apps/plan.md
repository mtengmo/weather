# Implementation Plan: Tengmo Väder Android App

**Branch**: `071-mobile-apps` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/071-mobile-apps/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Deliver Tengmo Väder as a native Android app, published on Google Play, with the same views, controls, data sources, settings, and look as the existing web app (Overview, Graph, Details, Map, warnings, favorites, personalization), plus small and medium home-screen widgets that show current/near-term weather for a chosen favorite or the device's live position. The app is built with Kotlin + Jetpack Compose (research.md §1), reuses the web app's existing data-source selection logic against the same public weather/geocoding APIs (research.md §5, contracts/weather-data-sources.md), and uses Jetpack Glance + WorkManager for widgets and background refresh within the spec's battery and freshness targets (research.md §2–4). iOS is explicitly out of scope for this feature.

## Technical Context

**Language/Version**: Kotlin (current stable), targeting a JVM/Android toolchain compatible with the compileSdk chosen below.

**Primary Dependencies**: Jetpack Compose (UI), Jetpack Glance (widgets), WorkManager (background refresh), FusedLocationProviderClient / Play Services Location (location), Jetpack DataStore (persistence), Ktor Client or Retrofit (networking) — see research.md §1–6.

**Storage**: On-device only — Jetpack DataStore for favorites, settings, last-viewed location, and widget targets; a small on-disk cache for the last successfully loaded weather snapshot per location/widget. No backend, no cloud sync (FR-018, FR-003).

**Testing**: JUnit + Kotlin test for unit/domain logic (data-source selection, aggregation, widget target resolution); Compose UI testing (androidx.compose.ui.test) for screen-level behavior; instrumented tests on-device/emulator for location and widget flows where unit tests can't reach the platform APIs.

**Target Platform**: Android phones, roughly the latest 4–5 major Android versions still receiving security updates at release time (spec.md Assumptions); tablets supported only to the extent the phone layout doesn't break.

**Project Type**: Mobile app (single Android application module; no separate backend — the app talks directly to the same public third-party APIs the web app already uses).

**Performance Goals**: Overview visible within 3 seconds of launch on a normal connection after permission is granted once (SC-005); first-time "open to seeing local weather" under 30 seconds including the permission prompt (SC-006); widget data never older than ~90 minutes under normal conditions (SC-010); a "My location" widget reflects a town change within 30 minutes (SC-011).

**Constraints**: No backend and no account/sign-in (FR-018); no tracking/analytics identifiers or ad SDKs (FR-018); background location requested only for "My location" widget setup, never at first launch (FR-027); widgets add under 2% daily battery use (SC-012); crash rate under 1% of sessions in month one (SC-009), observed via Google Play Console's built-in reporting without adding a tracking SDK (research.md §10); offline behavior must show last-loaded data with a clear indicator, never stale data presented as current (FR-020).

**Scale/Scope**: 4 primary screens (Overview, Graph, Details, Map) plus settings and favorites management, mirroring the existing web app's ~28 source components/services; 2 widget sizes; up to 10 favorites per device; single external distribution channel (Google Play).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled project template (no ratified principles) — no project-specific gates exist to check this plan against. No violations to record; **Complexity Tracking** below is left empty accordingly.

## Project Structure

### Documentation (this feature)

```text
specs/071-mobile-apps/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   ├── weather-data-sources.md
│   └── widget-app-interface.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# Existing web app (unchanged by this feature — FR-003)
src/                       # React/TypeScript web app (models, services, components, hooks)
tests/                     # Web app's Vitest suite

# New: Android app (this feature)
android/
├── app/
│   ├── src/main/kotlin/com/tengmo/vader/
│   │   ├── ui/                    # Compose screens: Overview, Graph, Details, Map, Settings, Favorites
│   │   │   ├── overview/
│   │   │   ├── graph/
│   │   │   ├── details/
│   │   │   ├── map/
│   │   │   ├── favorites/
│   │   │   └── settings/
│   │   ├── widget/                 # Glance widgets: small + medium, configuration activity
│   │   ├── data/
│   │   │   ├── model/              # Location, Favorite, ObservationSeries, WeatherWarning, Widget, etc. (data-model.md)
│   │   │   ├── source/             # SMHI, Open-Meteo, MET Norway, Nominatim clients (contracts/weather-data-sources.md)
│   │   │   ├── repository/         # Source-selection logic mirroring web's weatherApi.ts
│   │   │   └── local/              # DataStore-backed persistence (favorites, prefs, cached snapshots)
│   │   ├── location/                # FusedLocationProviderClient wrapper, significant-location-change handling
│   │   ├── work/                    # WorkManager periodic/expedited refresh jobs
│   │   └── theme/                   # Compose theme tokens mirroring web's Midnight/Ivory themes
│   ├── src/main/res/
│   │   ├── values/strings.xml       # English strings (default)
│   │   └── values-sv/strings.xml    # Swedish strings
│   └── src/test/ and src/androidTest/  # Unit and instrumented tests mirroring the structure above
└── build.gradle.kts, settings.gradle.kts
```

**Structure Decision**: A new top-level `android/` Gradle project alongside the existing `src/` web app, kept as sibling deliverables of the same repository (per FR-003, the web app is untouched). This is the standard "mobile app added to an existing repo" layout (Option 3 from the template, without a shared `api/` since neither app has a backend — both talk directly to the third-party weather/geocoding services per contracts/weather-data-sources.md). Internal Android package structure separates UI (per-screen, mirroring the web app's per-view components), widget code, the data layer (model/source/repository/local, mirroring the web app's models/services split), location, background work, and theming, so each maps cleanly back to an FR group in spec.md.

## Complexity Tracking

*No constitution violations to justify — table intentionally left empty (see Constitution Check above).*
