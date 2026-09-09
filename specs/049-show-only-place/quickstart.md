# Quickstart: Show Only the Place Name After Selecting a Location

## Validate

```sh
npm test -- locationName
npm test -- favoritesStorage
npm test -- locationCache
npm test -- appHeader
```

Confirm:
- `placeNameOnly("Uppsala, Uppsala County, Sweden")` → `"Uppsala"`; a bare name is unchanged.
- A favorite saved (in a test) with a full stored name reads back short via `listFavorites()`.
- A cached location with a full stored name reads back short via `getCachedLocation()`.
- Selecting a search result via "View" shows just the place name in the header.
- The search-results dropdown itself still shows the full "place, region, country" string.

## Full verification

```sh
npm run lint
npx tsc -b
npm test
npm run build
```
