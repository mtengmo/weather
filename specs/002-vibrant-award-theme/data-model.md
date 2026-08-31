# Phase 1 Data Model: Vibrant "Award-Worthy" Theme and Elevated Graph Styling

This feature introduces no new persisted entity and no change to any existing TypeScript type. It redefines the **visual meaning** of one existing enum value.

## Theme (unchanged shape, redefined value)

Defined in `src/models/types.ts` (no edit required):

```ts
export type Theme = "midnight" | "ivory" | "glass";
export const DEFAULT_THEME: Theme = "midnight";
```

| Identifier | Display label (picker) | Visual identity |
|---|---|---|
| `"midnight"` | "Midnight" | Unchanged — dark, editorial/premium (from `001-weather-history-locations`). |
| `"ivory"` | **"Bright"** (was "Ivory") | **Redefined by this feature** — bright/near-white background, high-saturation coral (`#e01050`) + lime/cyan (`#00d4b5`) accent pair, near-black text (research.md §1, §3). |
| `"glass"` | "Glass" | Unchanged — glassmorphism/premium-tech (from `001-weather-history-locations`). |

No new field, no new value, no new persistence key. `getThemePreference()` / `setThemePreference()` / `applyTheme()` (`src/services/theme.ts`) are unchanged (research.md §2).

## New CSS custom properties (not TypeScript entities, but part of this feature's "shape")

The existing per-theme CSS variable set in `src/index.css` (`--bg`, `--surface`, `--text`, `--text-muted`, `--accent`, `--border`, `--surface-alpha`, `--surface-blur`, `--error-bg`, `--error-text`, `--error-border`) is reused as-is for all three themes. This feature adds exactly one new variable, defined for all three themes (so FR-007's "elevated styling under all themes" has a value to read everywhere, not only under `[data-theme="ivory"]`):

- `--accent-2`: a secondary accent color, used sparingly for gradient pairing (research.md §1, §5). Values:
  - `midnight`: a muted secondary complementing the existing `--accent` (`#c9a86a`) — e.g. a deep teal (`#3a7d7a`), kept low-key to match Midnight's restrained character.
  - `ivory` ("Bright"): `#00d4b5` (electric lime/cyan — the second "popping" color from research.md §1).
  - `glass`: a secondary complementing the existing violet `--accent` (`#a78bfa`) — e.g. a soft cyan (`#67e8f9`), consistent with Glass's existing vibrant-but-translucent character.

No other new variables are introduced; chart chrome (grid/axis/legend/tooltip) reuses `--border`, `--text-muted`, and `--surface` (research.md §4).

## Validation rules

- `--accent-2` MUST meet the same contrast expectations as `--accent` wherever it is used against text or as a distinguishable chart element (research.md §6).
- No functional/behavioral field of `Theme`, `ObservationSeries`, `WeatherObservation`, `DailyAggregate`, or `NearbyStationSeries` (all defined in `001-weather-history-locations`) is added, removed, or reinterpreted by this feature — confirmed by the spec's Assumptions ("does not change any non-visual behavior, data, or functional requirement").
