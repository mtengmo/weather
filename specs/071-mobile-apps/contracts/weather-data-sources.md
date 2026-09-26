# Contracts: External Weather & Geocoding Data Sources

The Android app has no backend of its own (FR-018, FR-003), so its only external "contracts" are the same third-party data sources the web app already integrates with (research.md §5). This document is the interface reference the Android networking layer must reproduce, not a contract this app publishes to anyone else.

## Source-selection contract

Given a `Location` (latitude/longitude), the app MUST select a data source in this order, matching the web app's `weatherApi.ts`:

1. **Coverage check**: is the location within SMHI's forecast/observation coverage polygon?
   - **Yes** → attempt SMHI first.
     - SMHI observed data succeeds → use SMHI as `primarySource`.
       - If SMHI's own forecast is empty for a window that expects one, fetch a forecast-only result from Open-Meteo and merge it in, setting `forecastFromFallbackSource = true`. Observed points and station identity are untouched.
     - SMHI fails (network/parse error) → silently fall back to Open-Meteo for the whole series (`primarySource = OpenMeteo`).
   - **No** → use Open-Meteo directly (`primarySource = OpenMeteo`).
2. **Warnings** (SMHI only): only fetched when the location is within SMHI coverage; empty list otherwise.
3. **UV risk** (STRÅNG, SMHI only): only fetched when the location is within SMHI coverage; empty set otherwise.
4. **Reverse geocoding** (place name for a raw coordinate): Nominatim.
5. **Place search** (name → coordinates): Open-Meteo's geocoding API.

Failure at any step must degrade to the existing `Unavailable` / empty-result behavior already defined in the web app — never a crash, never a silently wrong value attributed to the wrong source.

## Endpoints

| Purpose | Base URL | Notes |
|---|---|---|
| SMHI observations | `https://opendata-download-metobs.smhi.se/api/version/1.0` | Historical station data |
| SMHI forecast | `https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point` | Grid-point forecast, all metrics in one call |
| SMHI warnings | `https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json` | Impact-Based Weather Warnings feed |
| SMHI UV (STRÅNG) | `https://opendata-download-metanalys.smhi.se/api/category/strang1g/version/1/geotype/point` | UV Index analysis |
| Open-Meteo forecast/observations | `https://api.open-meteo.com/v1/forecast` | Fallback source, worldwide |
| Open-Meteo geocoding | `https://geocoding-api.open-meteo.com/v1/search` | Place search |
| MET Norway forecast | `https://api.met.no/weatherapi/locationforecast/2.0/compact` | Per existing forecast-source logic (research.md §5) |
| Nominatim reverse geocoding | `https://nominatim.openstreetmap.org/reverse` | Coordinate → place name |

None require an API key. All are called directly from the device (no proxy), matching the web app and preserving the no-backend property (FR-018).

## Response shape → domain mapping

The app maps each source's native response into the shared `WeatherObservation` / `ObservationSeries` / `WeatherWarning` shapes defined in [data-model.md](../data-model.md), using the same field-derivation rules as the web app's `smhiProvider.ts`, `openMeteoProvider.ts`, and `metNoProvider.ts` (e.g. SMHI's raw `symbol_code` 1–27 preserved as `smhiSymbolCode` alongside a derived `symbolCondition`; Open-Meteo has no symbol code and leaves `symbolCondition` unset from its own data). Exact per-field parsing is an implementation detail to be carried over during the implementation phase, not re-specified here — the contract that matters for this feature is **which source wins and in what order** (above), since that is what SC-003 (identical values to the web app) depends on.

## Attribution

Both SMHI's and Open-Meteo's terms require visible attribution when their data is displayed; the app shows the same attributions as the web app's `PrivacyNotice`/footer content, adapted to a native settings/about screen.
