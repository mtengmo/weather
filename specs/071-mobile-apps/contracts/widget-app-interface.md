# Contract: Widget ↔ App Interface

The home-screen widgets (FR-021–FR-030) are a separate Android process/surface from the main app UI. This is the interface between them.

## Widget → App (tap)

- Tapping any widget instance (small or medium) launches the main app directly into the Overview view for that widget's resolved `Location` (FR-024), equivalent to calling the app's existing `selectLocation()` entry point with that location.

## App → Widget (configuration)

- Adding a widget to the home screen opens a configuration flow (Android's standard `AppWidgetConfigure` activity) where the user chooses:
  1. Size is fixed by which widget the user dragged from the picker (small vs. medium) — not chosen in this flow.
  2. Target: one of the current `Favorite`s, or "My location" (FR-025).
  - If "My location" is chosen and background location isn't yet granted, the flow explains why and requests `ACCESS_BACKGROUND_LOCATION` (FR-027) before completing setup.
- Changing a widget's target after creation is available from the widget itself (a settings affordance) or from the app's widget management screen — both write to the same `WidgetTarget` record.

## App → Widget (data updates)

- The app (via the background refresh jobs in research.md §3–4) writes an updated `CachedWeatherSnapshot` for each widget's resolved location, then triggers a Glance widget redraw.
- The widget itself never calls a network API directly — it only reads the most recent `CachedWeatherSnapshot` prepared by the app's background work, keeping all networking logic in one place (reusable by both the Overview screen and the widgets) and avoiding duplicate battery cost.

## Shared settings

- Widgets read `UserPreferences` (theme, unit, language) at render time (FR-023) — no separate widget-only settings exist. A settings change made in the app is reflected the next time any widget redraws (its own periodic refresh, or a redraw explicitly triggered right after the settings change).

## Removal / error states

- If a `Favorite` a widget targets is deleted, the widget's next redraw shows the "place removed — tap to choose another" state (FR-030) instead of the last cached snapshot.
- If background location is denied/revoked for a "My location" widget, the widget keeps showing `WidgetTarget.lastKnownLocation`'s cached snapshot, clearly labeled, plus a tappable affordance that opens the permission grant flow (FR-028).
