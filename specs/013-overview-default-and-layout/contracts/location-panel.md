# Contract: LocationPanel Component

## `src/components/LocationPanel.tsx` (new)

```ts
interface LocationPanelProps {
  currentLocation: Location | null;
  favorites: FavoritePlace[];
  favoritesError: string | null;
  selected: Location | null;
  onSelect: (location: Location) => void;
  onAddFavorite: (candidate: PlaceCandidate) => void;
  onRemoveFavorite: (id: string) => void;
  onDismissFavoritesError: () => void;
}
```

Renders:
- A toggle `<button aria-expanded={open} aria-controls="location-panel">Change location</button>`.
- When open, a panel (`id="location-panel"`) containing, unchanged internally:
  - `<LocationSwitcher currentLocation favorites selected onSelect={selectAndClose} />`
  - `<PlaceSearch onSelect={onAddFavorite} />` (adding to favorites, not selecting — matches
    today's behavior, where a search result is added as a favorite and the user then picks it
    from the favorites list, unchanged by this feature)
  - `<FavoritesList favorites error={favoritesError} selectedId onSelect={selectAndClose}
    onRemove={onRemoveFavorite} onDismissError={onDismissFavoritesError} />`

`selectAndClose(location)` calls `onSelect(location)` then closes the panel (FR-005).
`onAddFavorite`/`onRemoveFavorite`/`onDismissFavoritesError` do NOT close the panel (FR-006).

## State ownership

`LocationPanel` owns its own `open` boolean internally (no prop needed from `App.tsx` — the parent
doesn't need to know whether the panel is open, only pass through the same
favorites/search/location plumbing it already has). Internally:
- Outside-click (`document` `mousedown` listener, active only while open) closes the panel without
  calling `onSelect`.
- `Escape` keydown (active only while open) closes the panel without calling `onSelect`.
- An explicit `<button aria-label="Close">` inside the panel closes it without calling `onSelect`.

## `src/App.tsx` changes

Replaces the current inline `<PlaceSearch>`/`<FavoritesList>` JSX in the header, and the always-
visible `<LocationSwitcher>` below the header, with:

```tsx
<LocationPanel
  currentLocation={currentLocation}
  favorites={favorites}
  favoritesError={favoritesError}
  selected={selected}
  onSelect={selectLocation}
  onAddFavorite={(candidate) => add(candidate)}
  onRemoveFavorite={remove}
  onDismissFavoritesError={clearError}
/>
```

`selectLocation` itself changes to route to `"overview"` instead of `"graph"` (research.md §1).

## No changes to

- `LocationSwitcher.tsx`, `FavoritesList.tsx`, `PlaceSearch.tsx` — all three keep their existing
  props/behavior verbatim; only their mount point changes (inside `LocationPanel` instead of
  directly inside `App.tsx`'s header/body).
- `useFavorites`, `useGeolocation` — unchanged.
