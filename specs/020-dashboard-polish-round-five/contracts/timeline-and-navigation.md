# Contract: Timeline Overlay Positioning and Consolidated Navigation (US3, US4)

## `src/components/WeatherIconOverview.tsx` — overlay positioning (US3)

```tsx
{nowLeftPercent !== null && (
  <div
    className="weather-timeline-now"
    style={{ left: `calc(7rem + (100% - 7rem) * ${nowLeftPercent / 100})` }}
    aria-label="Now"
  >
    <span className="weather-timeline-now-label">Now</span>
  </div>
)}

{dayBoundaryPercents.map((percent, i) => (
  <div
    key={`day-boundary-${i}`}
    className="weather-timeline-day-boundary"
    style={{ left: `calc(7rem + (100% - 7rem) * ${percent / 100})` }}
    aria-hidden="true"
  />
))}
```

(`nowLeftPercent`/`dayBoundaryPercents`'s own computation — index-based fractions of
`timeline.periods.length` — is unchanged; only how that fraction is turned into a `left` value
changes.)

## `src/App.tsx` — consolidated navigation (US4)

See `data-model.md` for the full `header-actions` conditional block. Summary: "Back" always means
"go to Overview," from graph, details, or map alike; "Details" means "go to Details," from
Overview or graph alike.

## `src/components/ObservationChart.tsx`, `src/components/ObservationDetails.tsx`

```tsx
interface ObservationChartProps {
  // ...existing fields...
  // onViewDetails, onViewOverview — REMOVED
}
```

```tsx
<h2 ref={headingRef} tabIndex={-1} className="visually-hidden">
  {location.displayName}
</h2>
```

(Same removal/visually-hidden treatment applies to `ObservationDetailsProps`'s `onBack`/
`onViewOverview` and its own `<h2>`.) The `window-toggle`/local-header rows lose their
"View details"/"Overview"/"Back to graph" buttons entirely — those actions live only in
`App.tsx`'s header now.

## No changes to

- `MapView.tsx`, `App.tsx`'s `openMap`/`closeMap`/`previousView` state (019) — the Map
  "Back"/"Map" toggle is the pattern being extended, not itself changed.
- `.weather-timeline-sections`' `padding-left: 7rem` CSS technique — already correct; the overlay
  fix adopts the equivalent `calc()` form for elements positioned via JS-computed inline styles
  rather than a pure-CSS rule.
