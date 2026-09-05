# Contract: Header Location Name and Map Back Navigation (US1, US2)

## `src/App.tsx` — location name in the header

```tsx
<div className="current-conditions">
  <LocationPanel ... />
  {selected !== null && (
    <span className="current-location-name">{selected.displayName}</span>
  )}
  {currentConditions !== null && (
    <>
      <span className="current-temperature">...</span>
      ...
    </>
  )}
</div>
```

Rendered on every view (`current-conditions` already renders unconditionally in the header,
outside the `view === "overview"` gating that applies elsewhere) — satisfies FR-001's "every
view" requirement without per-view changes.

## `src/App.tsx` — map back navigation

```tsx
const [previousView, setPreviousView] = useState<View>("overview");

function openMap() {
  setPreviousView(view);
  setView("map");
}

function closeMap() {
  setView(previousView);
}
```

```tsx
<div className="header-actions">
  ...
  {view === "map" ? (
    <button type="button" onClick={closeMap}>
      Back
    </button>
  ) : (
    <button type="button" onClick={openMap}>
      Map
    </button>
  )}
</div>
```

The existing "Map" button's `onClick` changes from the literal `() => setView("map")` to
`openMap`; a new "Back" button (only rendered while `view === "map"`) replaces it in place, so
the header-actions layout doesn't shift width unexpectedly.

## No changes to

- `MapView.tsx` itself — it has no internal "close" concept; the fix is entirely in `App.tsx`'s
  view-management, consistent with how `ObservationChart`/`ObservationDetails` already receive
  `onViewDetails`/`onViewOverview` callbacks from `App.tsx` rather than managing navigation
  themselves.
