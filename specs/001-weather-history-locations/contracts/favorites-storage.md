# Contract: Favorites Storage (`services/favoritesStorage.ts`)

Internal module contract for persisting favorite places to `localStorage` (per [research.md](../research.md) §4 and [data-model.md](../data-model.md) `FavoritePlace`).

## Functions

```ts
function listFavorites(): FavoritePlace[]

function addFavorite(
  place: Pick<FavoritePlace, "latitude" | "longitude" | "displayName">
): FavoritePlace // throws on limit/duplicate — see below

function removeFavorite(id: string): void
```

### `listFavorites()`

- Reads the JSON array from the app's `localStorage` key and returns it (`[]` if absent or unparsable — corrupt/legacy data is treated as empty, not a thrown error).

### `addFavorite(place)`

Preconditions: `place.latitude`/`place.longitude` are valid ranges; `place.displayName` is non-empty (caller's responsibility, typically already guaranteed by `geocoding-service`'s output).

Behavior:
1. Reads the current list.
2. **Duplicate check** (FR-012): if an existing entry's `(latitude, longitude)` rounded to 4 decimal places matches the incoming place, throws a `DuplicateFavoriteError` — no mutation occurs.
3. **Limit check** (FR-009): if the current list already has 10 entries, throws a `FavoritesLimitReachedError` — no mutation occurs.
4. Otherwise generates a new `id` (UUID) and `addedAt` (now), appends, writes the full array back to `localStorage`, and returns the new `FavoritePlace`.

### `removeFavorite(id)`

- Reads the current list, filters out the entry with matching `id`, writes the result back. Removing a non-existent `id` is a no-op (idempotent), not an error.

### Error handling

| Condition | Result |
|---|---|
| Adding beyond the 10-place cap | Throws `FavoritesLimitReachedError` — UI maps this to the FR-009 user-facing message |
| Adding a coordinate-duplicate place | Throws `DuplicateFavoriteError` — UI maps this to a "already saved" message (FR-012) |
| `localStorage` unavailable (e.g., disabled by browser settings) | `listFavorites()` returns `[]`; `addFavorite`/`removeFavorite` throw a `StorageUnavailableError` — UI informs the user favorites can't be saved in this browser session |

### Postconditions

- After a successful `addFavorite` or `removeFavorite`, a subsequent `listFavorites()` call (including after a page reload) reflects the change — satisfies FR-006 persistence across sessions.
