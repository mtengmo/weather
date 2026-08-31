# Contract: Theme Service (`services/theme.ts`)

Internal module contract for resolving, persisting, and applying the visual theme (FR-023–FR-025, [research.md](../research.md) §14, [data-model.md](../data-model.md) `Theme`).

## Functions

```ts
type Theme = "midnight" | "ivory" | "glass";

function getThemePreference(): Theme

function setThemePreference(theme: Theme): void

function applyTheme(theme: Theme): void
```

### `getThemePreference()`

- Reads a persisted choice from `localStorage` if present and valid (`"midnight" | "ivory" | "glass"`); otherwise returns `"midnight"` (FR-025's default). Never throws — falls back to `"midnight"` if `localStorage` is unavailable.

### `setThemePreference(theme)`

- Persists `theme` to `localStorage` under a dedicated key (separate from favorites and unit preference keys). Best-effort: if `localStorage` is unavailable, the call is a no-op rather than throwing — the in-memory selection (via `applyTheme`) still takes effect for the current session, it just won't survive a reload.

### `applyTheme(theme)`

- Sets `data-theme="{theme}"` on `document.documentElement`. Pure DOM side effect, synchronous, no network — this is what makes SC-008 ("within 1 second, no reload") trivially satisfiable.
- Idempotent: calling it repeatedly with the same value is harmless.

### Postconditions

- After `setThemePreference(theme)` followed by a reload, `getThemePreference()` returns `theme`.
- `applyTheme` never fails silently in a way that leaves the app unstyled — an invalid/unrecognized theme value is never passed to it (callers only ever pass one of the three `Theme` values; `getThemePreference` guarantees this by falling back to `"midnight"` for anything else read from storage).
