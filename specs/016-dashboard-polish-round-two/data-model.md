# Data Model: Dashboard Polish Round Two

## `src/components/timelineData.ts`

### `TimelineRowPoint` — new optional field

```ts
export interface TimelineRowPoint {
  // ...existing fields unchanged...
  /** Per-source forecast breakdown for the temperature row, when "Combine forecast sources" is
   *  on and 2+ sources have data for this period (016-dashboard-polish-round-two, FR-002). Only
   *  ever set on forecast periods; never fabricated for observed ones. */
  sources?: { label: string; value: number | null }[];
}
```

### `buildRows` / `RowSource` — new optional field

```ts
interface RowSource {
  // ...existing fields unchanged...
  sources?: { label: string; value: number | null }[];
}
```

Passed straight through onto `TimelineRowPoint.sources` for the temperature row only (mirrors how
`high`/`low` are already temperature-row-only fields).

### New: `mergeMultiSourceIntoTimelinePoints`

```ts
/** Populates TimelineRowPoint.sources for the temperature row's forecast periods, matching each
 *  MultiSourceForecastEntry's observations to a period by timestamp range (016, FR-002). */
export function mergeMultiSourceIntoTimelinePoints(
  temperatureRow: TimelineRow,
  periods: TimelinePeriod[],
  multiSourceForecast: MultiSourceForecastEntry[]
): void;
```

Mutates `temperatureRow.points` in place (same pattern `interpolateNowBoundary` already uses),
called from `WeatherIconOverview.tsx` after building the timeline, only when
`combineForecastSources` is true and `multiSourceForecast.length > 1`.

## `src/components/WeatherIconOverview.tsx`

### New props

```ts
interface WeatherIconOverviewProps {
  // ...existing fields unchanged...
  combineForecastSources: boolean;
  multiSourceForecast: MultiSourceForecastEntry[];
}
```

### `OVERVIEW_WINDOWS` — relabeled

```ts
const OVERVIEW_WINDOWS: { value: OverviewDisplayMode; label: string }[] = [
  { value: "last-24-hours", label: "24 Hours" },
  { value: "last-3-days", label: "3 Days" },
  { value: "last-7-days", label: "7 Days" },
];
```

### Day-boundary marker

A new derived value, computed alongside `nowLeftPercent`:

```ts
/** Left-percent position of each day boundary on the 3-day view — the point between one
 *  calendar day's last sub-day period and the next day's first (016, FR-003). Empty on the
 *  7-day view (every column is already its own day). */
const dayBoundaryPercents: number[] =
  displayMode === "last-3-days"
    ? timeline?.periods
        .map((p, i) => (i > 0 && i % 5 === 0 ? (i / timeline.periods.length) * 100 : null))
        .filter((v): v is number => v !== null) ?? []
    : [];
```

(`i % 5 === 0` relies on the 3-day view always producing groups of exactly 5 sub-day periods per
day, per `toSubDayBuckets`' own contract from 015 — no change needed there.)

### `Details` button removed from this component

The local `<div className="app-header">…<button onClick={onBack}>Back to graph</button></div>`
block is removed entirely — `onBack` becomes a prop `App.tsx` wires directly to its own new header
button instead (see below). `WeatherIconOverview`'s own heading (`<h2>{location.displayName} —
overview</h2>`) stays, just without the button beside it.

## `src/App.tsx`

### Header layout

```tsx
<header className="app-header">
  <div className="header-controls">
    <ThemePicker ... />
    <UnitToggle ... />
    {view !== "overview" && <NearbyStationCountControl ... />}
    <HighLowToggle ... />
    <CombineForecastToggle ... />
  </div>
  <div className="header-actions">
    {view === "overview" && (
      <button type="button" onClick={() => setView("graph")}>
        Details
      </button>
    )}
    <LocationPanel ... />
  </div>
</header>
```

`WeatherIconOverview` no longer receives an `onBack` prop — `App.tsx` now owns switching to the
graph view directly from its own header button, the same way it already owns every other
view-switching call.

### New `View` value

```ts
type View = "graph" | "details" | "overview" | "map";
```

`MapView` renders under a new `{selected === null && view === "map"}`-independent branch (the map
doesn't require a `selected` location the way the other views do — it's how a location often gets
selected in the first place) — see `contracts/map.md`.

### Multi-source props threaded to the Overview

```tsx
<WeatherIconOverview
  // ...existing props...
  combineForecastSources={combineForecastSources}
  multiSourceForecast={multiSourceForecast}
/>
```

(Both values already exist in `App.tsx`'s state, from 014 — see `src/App.tsx:34,44` — this is
purely passing them one level further.)

### Footer mount

```tsx
<Footer />
```

Rendered once, after the `<div className="app">…</div>` root content (i.e., outside the max-width
content column so it can span full width if desired, or inside — either is a pure styling choice
left to implementation), present regardless of `view` or `selected`.

## `src/services/appVersion.ts` (new)

```ts
/** Injected at build time via vite.config.ts's `define` — package.json's version plus a short
 *  git commit hash, e.g. "0.1.0 (a41fea7)" (016, FR-010). Falls back to "dev" outside a Vite
 *  build (e.g. a test runner that doesn't define it). */
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
```

## `src/components/Footer.tsx` (new)

```ts
interface FooterProps {} // no props — reads APP_VERSION directly
```

Renders `<footer>` with small text: `Weather History v{APP_VERSION}` and a "Privacy" button that
toggles `PrivacyNotice`'s visibility (local `useState`, same dropdown-panel pattern as
`LocationPanel`).

## `src/components/PrivacyNotice.tsx` (new)

```ts
interface PrivacyNoticeProps {
  onClose: () => void;
}
```

Static content panel — no props beyond a close handler.

## `src/components/MapView.tsx` (new)

```ts
interface MapViewProps {
  favorites: FavoritePlace[];
  cachedLocation: Location | null; // most-recently-viewed, from locationCache.ts
  onSelectLocation: (location: Location) => void;
}
```

Renders a `react-leaflet` `<MapContainer>` with one `<Marker>` per favorite (converted via the
same `favoriteToLocation` helper `LocationSwitcher.tsx` already has) plus one more for
`cachedLocation` if it's not already one of the favorites. Each marker's popup shows the location's
`displayName` and a "View" button calling `onSelectLocation`. Empty state (no favorites, no cached
location) renders a message instead of an empty map, per FR-015.

## Validation Rules

- `TimelineRowPoint.sources` is only ever set for the temperature row's forecast periods — never
  for observed periods, never for any other row (precipitation/wind/snow).
- `dayBoundaryPercents` only ever populates on the 3-day view; always empty on 24h/7-day.
- `MapView` never fetches weather data — it only reads `favorites`/`cachedLocation`, both already
  in memory from existing hooks, and only calls `onSelectLocation`, never `getObservations`
  directly.
- The service worker (PWA) precache manifest excludes any request to
  `opendata-download-metobs.smhi.se`, `opendata-download-metfcst.smhi.se`,
  `api.open-meteo.com`, or `geocoding-api.open-meteo.com` — only same-origin build assets are
  cached.
