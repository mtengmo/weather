# Contract: Location Panel Actions (User Stories 1-2)

## `src/components/PlaceSearch.tsx`

```tsx
interface PlaceSearchProps {
  onAddFavorite: (place: PlaceCandidate) => void; // renamed from onSelect
  onView: (place: PlaceCandidate) => void;         // NEW
}
```

Each result `<li>` renders two buttons: the existing "Add to favorites" (now calling
`onAddFavorite`) and a new "View" button calling `onView`, both passed the same `PlaceCandidate`.
Selecting "View" also clears the search query/results the same way "Add to favorites" already
does today (so the panel doesn't linger on stale search state after either action).

## `src/components/LocationPanel.tsx`

```tsx
interface LocationPanelProps {
  // ...existing fields...
  geoStatus: GeolocationStatus;
  onRequestCurrentLocation: () => void;
}
```

```tsx
function candidateToLocation(place: PlaceCandidate): Location {
  return { latitude: place.latitude, longitude: place.longitude, displayName: place.displayName, source: "favorite" };
}

<PlaceSearch
  onAddFavorite={onAddFavorite}
  onView={(place) => selectAndClose(candidateToLocation(place))}
/>

<LocationSwitcher
  currentLocation={currentLocation}
  favorites={[]}
  selected={selected}
  onSelect={selectAndClose}
  geoStatus={geoStatus}
  onRequestCurrentLocation={onRequestCurrentLocation}
/>
```

## `src/components/LocationSwitcher.tsx`

```tsx
interface LocationSwitcherProps {
  // ...existing fields...
  geoStatus: GeolocationStatus;
  onRequestCurrentLocation: () => void;
}
```

Rendering logic for the current-location slot:

```tsx
{currentLocation ? (
  <button type="button" aria-pressed={isSameLocation(selected, currentLocation)} onClick={() => onSelect(currentLocation)}>
    Current Location
  </button>
) : (geoStatus === "denied" || geoStatus === "unavailable") ? (
  <button type="button" onClick={onRequestCurrentLocation}>
    Use current location
  </button>
) : null}
```

## `src/App.tsx`

```tsx
<LocationPanel
  // ...existing props...
  geoStatus={geoStatus}
  onRequestCurrentLocation={requestLocation}
/>
```

`geoStatus` and `requestLocation` are already destructured from `useGeolocation()` in `App.tsx` —
no new hook usage needed, just passing values that already exist through one more layer.

## No changes to

- `useGeolocation.ts` — `request` is already safe to call multiple times (research.md §2).
- `FavoritesList.tsx` — unaffected by either user story.
