# Data Model: Show Only the Place Name After Selecting a Location

No new entities or persisted fields. One new pure function:

```ts
// src/services/locationName.ts
export function placeNameOnly(fullName: string): string
```

`Location.displayName` and `FavoritePlace.displayName` keep their existing shape (`string`) — this feature only changes what value ends up in that field by the time it's read, at the three points listed in research.md §2. `PlaceCandidate.displayName` (search-results-only) is untouched.
