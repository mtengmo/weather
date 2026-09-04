# Contract: Overview Fixes and Polish (User Stories 1, 3, 4, 5, 6)

## User Story 1 — 3-day view regression guard

No production code change. Add to `tests/integration/weatherIconOverview.test.tsx`:

- A test switching 24h → 3-day directly (no intermediate 7-day click) for a location with
  multi-day forecast, asserting 15 periods render.
- A test performing the toggle sequence 3-day → 7-day → 3-day → 24h → 3-day, asserting the correct
  period count (15/14/15/48/15) at each step.
- A test for a location whose forecast reaches only 1 day out, asserting exactly 5 periods (not
  15, not 0) — confirms FR-001's "never fewer days than the forecast supports" holds precisely,
  neither over- nor under-showing.

## User Story 3 — Day-boundary marker

`src/components/WeatherIconOverview.tsx`:

```tsx
const dayBoundaryPercents: number[] =
  displayMode === "last-3-days" && timeline !== null
    ? timeline.periods
        .map((_p, i) => (i > 0 && i % 5 === 0 ? (i / timeline.periods.length) * 100 : null))
        .filter((v): v is number => v !== null)
    : [];
```

Rendered alongside the existing "Now" marker:

```tsx
{dayBoundaryPercents.map((percent, i) => (
  <div
    key={`day-boundary-${i}`}
    className="weather-timeline-day-boundary"
    style={{ left: `${percent}%` }}
    aria-hidden="true"
  />
))}
```

`src/index.css`:

```css
/* Subtle day-boundary marker on the 3-day view (016, FR-003) — distinct from .weather-timeline-now
   (no label, softer, no dash pattern) so the two are never confused. */
.weather-timeline-day-boundary {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(to bottom, transparent, var(--border) 15%, var(--border) 85%, transparent);
  box-shadow: 0 0 6px 1px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}
```

`aria-hidden="true"` since the same information (which day a column belongs to) is already
conveyed by the period's own sub-day label sequence to assistive tech — this is a purely visual aid.

## User Story 4 — Button labels

`src/components/WeatherIconOverview.tsx`:

```ts
const OVERVIEW_WINDOWS: { value: OverviewDisplayMode; label: string }[] = [
  { value: "last-24-hours", label: "24 Hours" },
  { value: "last-3-days", label: "3 Days" },
  { value: "last-7-days", label: "7 Days" },
];
```

Existing tests referencing `"Last 24 hours"` / `"Last 3 days"` / `"Last 7 days"` button names update
to the new labels (mechanical find/replace across `tests/integration/weatherIconOverview.test.tsx`).

## User Story 5 — "Details" button, repositioned

`src/components/WeatherIconOverview.tsx`: remove the `onBack` prop and its button entirely from
this component's own local header row — see `data-model.md`.

`src/App.tsx`: add the button to the persistent header, shown only on the Overview:

```tsx
<div className="header-actions">
  {view === "overview" && (
    <button type="button" onClick={() => setView("graph")}>
      Details
    </button>
  )}
  <LocationPanel ... />
</div>
```

`src/index.css`:

```css
.app-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
```

(`justify-content: space-between` pushes `.header-actions` to the row's right edge on wide
viewports; the existing `flex-wrap: wrap` already handles narrow viewports by stacking, unchanged.)

Existing tests referencing `getByRole("button", { name: "Back to graph" })` update to
`"Details"`, and move their render/click target from `WeatherIconOverview`'s own header to the
app-level header (i.e., tests using the `OverviewHarness` wrapper in
`weatherIconOverview.test.tsx` need an `onBack`-less `WeatherIconOverview` render, with any
"Details"-button test instead exercised at the `App.tsx` integration level in
`tests/integration/appHeader.test.tsx`).

## User Story 6 — Header consistency

No code change beyond User Story 5 and the map screen's own addition (`contracts/map.md`). Add a
test in `tests/integration/appHeader.test.tsx` asserting "Change location" is present in the
document for each of the app's views (graph, details, overview, map) — a straightforward assertion
over the app's existing (already-correct) layout, not a behavior change.
