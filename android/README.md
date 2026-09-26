# Tengmo Väder — Android app

The native Android version of the Tengmo Väder web app (Kotlin + Jetpack Compose), with the same
views, data sources, settings and look, plus small and medium home-screen widgets.

Specification, plan and task list: [specs/071-mobile-apps/](../specs/071-mobile-apps/).

## Build & run

Prerequisites: JDK 17 and the Android SDK (platform 35, build-tools 35.0.0). Point Gradle at the SDK
either with the `ANDROID_HOME` environment variable or a `sdk.dir=...` line in `android/local.properties`
(that file is machine-specific and git-ignored).

```powershell
cd android
.\gradlew.bat :app:testDebugUnitTest   # unit tests
.\gradlew.bat :app:assembleDebug       # -> app/build/outputs/apk/debug/app-debug.apk
.\gradlew.bat :app:installDebug        # install on a connected device / emulator
```

The map's Temperature and Wind overlays need a free OpenWeatherMap key (the web app's optional
`VITE_OPENWEATHERMAP_API_KEY`); without one those two overlays are hidden, exactly as on the web.
Provide it with `-POPENWEATHERMAP_API_KEY=...` or the `OPENWEATHERMAP_API_KEY` environment variable.

## Layout

| Path | What |
|---|---|
| `app/src/main/kotlin/com/tengmo/vader/data/` | models, the four data-source clients (`source/`), source-selection + aggregation logic (`repository/`), on-device stores (`local/`) |
| `.../ui/` | Compose screens: `overview/`, `graph/`, `details/`, `map/`, `favorites/`, `settings/` |
| `.../widget/` | Glance widgets (small, medium), configuration activity, tap handling |
| `.../work/`, `.../location/` | WorkManager widget refresh, significant-location-change tracking, permission flows |
| `app/src/main/res/` | strings (English + Swedish), colors, icons, weather artwork |
| `scripts/gen_strings.py` | regenerates `strings.xml` from the web app's `src/i18n/{en,sv}.ts` — re-run when those change |

## Notes

- **Parity with the web app.** The data layer is a port of `src/services/*` (SMHI → Open-Meteo fallback,
  MET Norway forecast, hourly grid, daily aggregation, weather-condition rules, feels-like), so the same
  place and time gives the same values. Icons/characters are the web app's PNGs.
- **Privacy.** No account, no backend, no analytics or tracking SDK. Background location is requested only
  when a "My location" widget is set up.
- **Crash reporting.** Google Play Console's built-in crash/ANR reporting is used; no SDK is added.
