# Contract: Theme CSS Variable Set (`src/index.css`)

Internal styling contract consumed by every themed component and by chart chrome (FR-002, FR-004, FR-007, [research.md](../research.md) §1, §4, §5, [data-model.md](../data-model.md)).

This extends, and does not replace, the CSS-variable contract already established by `001-weather-history-locations`'s theme feature (same file, same `[data-theme="..."]` selector pattern).

## Variables (per `[data-theme]` value)

| Variable | Consumers | Contract |
|---|---|---|
| `--bg`, `--surface`, `--text`, `--text-muted`, `--accent`, `--border`, `--surface-alpha`, `--surface-blur`, `--error-bg`, `--error-text`, `--error-border` | All components (unchanged from `001-weather-history-locations`) | Unchanged shape; only the `[data-theme="ivory"]` block's values change (research.md §1). |
| `--accent-2` (**new**) | Chart gradient fills ([ObservationChart.tsx](../../../src/components/ObservationChart.tsx)); available for any future secondary-accent use | MUST be defined under all three `[data-theme="..."]` blocks (`midnight`, `ivory`, `glass`) so consumers never read an unset variable regardless of active theme. MUST meet the contrast rules in [data-model.md](../data-model.md) wherever used against text or as a distinguishable graphical element. |

## Consumers outside `index.css`

- **`src/components/ObservationChart.tsx`**: reads `var(--accent-2)` (and reuses the existing `var(--surface)`, `var(--border)`, `var(--text-muted)`) via the `<Tooltip contentStyle=...>` prop and the `<linearGradient>` stop colors for the precipitation `<Bar>` fill (research.md §4, §5). MUST NOT hardcode a hex value for anything that already has a CSS variable — any new chart-chrome color introduced by this feature MUST be expressed as a CSS variable reference, consistent with the rest of the theme system.
- **`src/components/ThemePicker.tsx`**: unchanged props/behavior; only its `THEMES` label array changes (`"Ivory"` → `"Bright"`, research.md §3) — no new prop, no contract change.

## Postconditions

- Switching `data-theme` (via the existing `applyTheme()`, unchanged) immediately updates every consumer above with no re-render/JS re-computation required, because all consumers reference CSS variables (either via stylesheet rules or inline `var(...)` strings) rather than resolved color values — preserving SC-002 (theme switch reflected within 1 second, no reload).
- A theme missing `--accent-2` would leave a chart gradient/tooltip accent unstyled (falls back to the CSS-inherited/initial value); this contract's "MUST be defined under all three blocks" rule exists specifically to prevent that.
