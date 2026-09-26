# Research: Tengmo Väder Android App

Phase 0 output for [spec.md](spec.md). Each decision below resolves one open technical question from the plan's Technical Context.

## 1. Language & UI toolkit

**Decision**: Kotlin, with Jetpack Compose for all screens.

**Rationale**: The spec requires a native app (FR-001a) for platform-native feel and performance. Compose is the current, actively developed Android UI toolkit, gives the fastest path to matching the web app's card-based, chart-heavy layout, and its declarative model maps well onto the existing React component structure (`WeatherIconOverview`, `ObservationChart`, `MapView`, etc.), easing the mental translation from the source of truth.

**Alternatives considered**: Classic Android Views/XML layouts — more boilerplate for the same result and a worse fit for the frequent theme/state-driven re-rendering this app needs. Kotlin Multiplatform (sharing logic/UI with a future iOS app) — rejected for this feature per the "native apps, best user experience" clarification and because iOS is an explicitly separate follow-up feature; revisit if the iOS follow-up wants to share the data layer.

## 2. Widget technology

**Decision**: Jetpack Glance for both the small and medium widgets.

**Rationale**: Glance is Android's current Compose-based widget framework, replacing RemoteViews boilerplate, and is the supported way to build widgets alongside a Compose app. It supports the two widget sizes and the theme-following colors FR-023 requires.

**Alternatives considered**: Classic RemoteViews — more code, no Compose code-sharing with the main app's theme tokens. A single resizable widget rather than two fixed sizes — rejected; the spec (FR-021/FR-022) defines two distinct content sets, not one that trims itself down.

## 3. Background location for "My location" widgets

**Decision**: `ACCESS_BACKGROUND_LOCATION` requested only via Android's staged flow — first foreground location ("while using the app"), then a follow-up system prompt for "allow all the time" — triggered only from "My location" widget setup, using `FusedLocationProviderClient` with a significant-location-change style request (large displacement threshold, low frequency) rather than continuous tracking.

**Rationale**: Matches FR-027 (never requested at first launch) and SC-012 (battery budget). Android requires the two-step foreground-then-background permission flow for apps targeting current API levels; requesting background location outside of an obvious, user-initiated context (like adding a widget) also risks Play Store rejection. A large-displacement passive location request (rather than continuous high-accuracy tracking) is what keeps a "moved to another town" signal (FR-026, SC-011) inside the 2%-battery budget (SC-012).

**Alternatives considered**: Geofencing API keyed to the widget's last known town — more precise about "noticeable move" but adds complexity disproportionate to a weather app's needs; deferred as a possible optimization, not required to meet SC-011's 30-minute target. Continuous foreground-service location tracking — rejected outright, far exceeds the battery budget and requires a persistent notification that has no purpose here.

## 4. Background refresh scheduling

**Decision**: `WorkManager` periodic work (widget refresh, floor ~15 minutes per Android's periodic-work minimum, chosen interval tuned to stay under the 90-minute staleness target with margin) plus an expedited one-off `WorkManager` request triggered by the significant-location-change callback from Decision 3.

**Rationale**: WorkManager is the standard, battery-conscious, Doze/App-Standby-aware way to run periodic background work on Android, and satisfies FR-029's "no noticeable battery drain" without the app needing to manage AlarmManager/wake locks directly.

**Alternatives considered**: `AlarmManager` with exact alarms — more precise timing than needed and exempt from most power optimizations, meaning it fights the battery budget rather than helping it. Firebase Cloud Messaging push-triggered refresh — would need a backend to send pushes, which conflicts with the app's (and web app's) no-backend, no-account design (FR-018).

## 5. Networking & data sources

**Decision**: Reuse the same four public data sources and the same source-selection order the web app already uses: SMHI open data (`opendata-download-metobs.smhi.se`, `opendata-download-metfcst.smhi.se`, `opendata-download-warnings.smhi.se`, `opendata-download-metanalys.smhi.se`) for Sweden, with Open-Meteo (`api.open-meteo.com`, `geocoding-api.open-meteo.com`) as the automatic fallback everywhere else and for forecast-only gaps, MET Norway (`api.met.no`) per the web app's existing forecast-source logic, and OpenStreetMap Nominatim (`nominatim.openstreetmap.org`) for reverse geocoding. Calls made with Ktor Client (or Retrofit — either is a standard fit; Ktor chosen for first-party Kotlin coroutine integration).

**Rationale**: FR-005 requires identical values from the same source-selection rules; re-implementing the source order (`smhiProvider` → `openMeteoProvider` fallback, MET Norway forecast handling, SMHI-coverage bounding-polygon check) is simpler and less risky than inventing a new selection strategy, and keeps the two apps' behavior provably equivalent for SC-003.

**Alternatives considered**: A shared backend proxy fronting these APIs — rejected; it would add a server the project doesn't otherwise need or want (no-backend is a stated project property) and become a new single point of failure and cost.

## 6. Local persistence (favorites, settings, cached snapshot)

**Decision**: Jetpack DataStore (Proto or typed-Preferences DataStore) for favorites, settings, and the last-viewed location; a small on-disk cache (DataStore or a lightweight file) for the last successfully loaded weather snapshot per widget/location (FR-020, FR-028).

**Rationale**: DataStore is the current recommended replacement for SharedPreferences, is coroutine/Flow-native (fits Compose state), and survives app restarts and device reboots (FR-007) as required.

**Alternatives considered**: Room (SQLite) — more machinery than 10 favorites and a handful of settings need; possible later if query needs grow, not justified now. Plain SharedPreferences — legacy API, no structured/typed access, no Flow support.

## 7. Charts (timeline graph)

**Decision**: A Compose-native charting approach — either a maintained Compose charting library or a small custom Canvas-based chart — reproducing the web app's line/area chart behavior (metric switch, time window, high/low markers, forecast-vs-observed styling, touch-drag value inspection).

**Rationale**: No off-the-shelf Android chart library is a drop-in visual match for the existing Recharts-based `ObservationChart`; the styling (per-theme colors, forecast dashing, now-marker, nearby-station comparison lines) is specific enough that the actual chart-drawing decisions belong in the implementation phase, informed by whichever library is chosen there. Recorded here only as "build on Compose Canvas / a Compose chart library," not a specific package, so the choice can be validated against the real design during implementation.

**Alternatives considered**: A WebView embedding the existing web chart — rejected, contradicts FR-001a's native requirement and would fight platform gesture/back handling (FR-014).

## 8. Map (rain/temperature/wind overlays)

**Decision**: A native map surface (e.g. an OSM-tile-based Compose map library) with the same three data overlays (rain, temperature, wind) and "none" option as the web app's Leaflet-based `MapView`, sourced from the same weather providers' gridded/forecast data used today.

**Rationale**: FR-004 requires the map view with its overlay picker; a memory note already on file records that a previous embedded third-party map (Windy) was rejected, so the overlays must continue to be the app's own rendering over map tiles, not a third-party weather site — consistent with the existing Assumption in spec.md.

**Alternatives considered**: Embedding a third-party weather map site in a WebView — explicitly rejected per existing project precedent and FR-001a.

## 9. Localization

**Decision**: Android string resources (`strings.xml` for `values/` and `values-sv/`) with the same keys' meaning as `src/i18n/en.ts` / `src/i18n/sv.ts`, and the same "auto" (follow device locale) / English / Swedish preference (FR-009, FR-006).

**Rationale**: `strings.xml` is the standard Android localization mechanism and integrates with the OS's own locale/font-scale handling, which the accessibility requirement (SC-007) also depends on.

**Alternatives considered**: Bundling the existing TypeScript i18n files as raw data and parsing them at runtime — unnecessary indirection; a one-time content port to `strings.xml` is simpler and keeps translations in the idiomatic place for the platform.

## 10. Crash/error visibility without tracking

**Decision**: Android's built-in, on-device crash handling (system crash dialog / logcat) during development; for the released app, a privacy-respecting crash-reporting approach that collects only crash stack traces (no identifiers, no analytics, no third-party ad/tracking SDK) is evaluated during implementation planning against SC-009's 1%-crash-session target and FR-018's no-tracking-identifiers rule.

**Rationale**: FR-018 forbids tracking/analytics identifiers, but SC-009 still requires a measurable crash rate, so *some* crash visibility is needed; the exact mechanism (e.g. Play Console's own built-in crash/ANR reporting, which requires no added SDK) is deferred to implementation since it depends on final build tooling, not on product scope.

**Alternatives considered**: A full analytics/crash SDK (e.g. one bundling ad-identifier or usage-analytics collection) — rejected outright, conflicts with FR-018. Google Play Console's own crash reporting (automatically collected for apps distributed through Play, no SDK integration) is the leading candidate and needs no further clarification to proceed with planning.

## 11. Distribution & app identity

**Decision**: Single Android application (minSdk targeting the "latest 4-5 major versions still receiving security updates" per spec.md Assumptions, compileSdk/targetSdk at the latest stable Android API level at build time), published as a new listing on Google Play under the existing "Tengmo Väder" name and app icon (FR-002), phone form factor only (tablet excluded from Play's tablet-specific requirements per spec.md's "sensible, non-broken" assumption).

**Rationale**: Directly satisfies FR-001/FR-002 and the Assumptions section; no ambiguity remains after clarification.
