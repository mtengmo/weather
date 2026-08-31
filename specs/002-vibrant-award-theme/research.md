# Phase 0 Research: Vibrant "Award-Worthy" Theme and Elevated Graph Styling

## 1. External design inspiration (FR-003b)

**Decision**: Base the new theme's palette on the current ("dopamine design") web-design trend of a near-white/bright neutral background with one or two strategically-applied, highly-saturated "electric" accent colors — not a full-saturation background. Concretely:

- Background: near-white (`#fffdf9`), not the previous "Ivory" warm-cream (`#faf7f2`) — brighter and more neutral so the accent colors read as "popping" against it.
- Primary text: near-black (`#151316`) for maximum contrast against the bright background (WCAG AA/AAA headroom).
- Primary accent: an electric coral/pink (`#e01050`) replacing the previous muted bronze (`#8a6d3b`) — used for links, active controls, focus rings, chart primary series accents. (Darkened from an initial `#ff3d6e` candidate during §6's contrast check — `#ff3d6e` only cleared 3.36:1 against the new background, short of the 4.5:1 normal-text threshold since `--accent` colors body-sized links; `#e01050` clears 4.74:1 while still reading as a saturated, "popping" coral.)
- Secondary accent: an electric lime/cyan (`#00d4b5`) — used sparingly (gradient pairing, secondary chart accents, hover/active highlights) so the two accents read as "popping colors" (plural) without turning the whole surface neon.
- Surfaces (cards/panels): pure white (`#ffffff`) with a crisper, slightly darker border (`#e7e2da` → `#e5e0f0`-tinted neutral) than before, so panels still separate cleanly from the brighter background.

**Rationale**: Web search on 2026 design-trend coverage (Figma's trend report, Muzli's dashboard-design roundup, and color-trend pieces) converges on the same pattern for sites/dashboards that read as "award-worthy": a clean, bright/neutral base with one or two highly-saturated accent colors used strategically (buttons, key metrics, highlights) rather than saturating the whole surface — described as "dopamine design." This directly matches the user's ask ("bright light one with popping colors") and satisfies FR-003b's requirement to draw on generic contemporary conventions rather than a specific named product.

**Alternatives considered**:
- **Full-saturation background** (e.g., a bright gradient wash behind all content): rejected — fails FR-005 (text/series legibility) and reads as gimmicky rather than "award-worthy," which the trend sources call out as the wrong way to apply this style.
- **Single accent color only**: rejected — "popping colors" (plural) plus the dopamine-design pattern both point to a two-color accent pairing (coral + lime/cyan) used for primary vs. secondary emphasis.
- **Matching a specific named product's palette**: rejected per the spec clarification — the user confirmed generic inspiration, no specific site to replicate.

Sources consulted: [Figma — Top Web Design Trends for 2026](https://www.figma.com/resource-library/web-design-trends/), [Muzli — 50 Best Dashboard Design Examples for 2026](https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/), [Lounge Lizard — 2026 Web Design Color Trends](https://www.loungelizard.com/blog/web-design-color-trends/).

## 2. Theme identifier / migration (FR-001, FR-003a)

**Decision**: No code-level migration is needed. `Theme` stays the literal union `"midnight" | "ivory" | "glass"` (`src/models/types.ts`) and the persisted `localStorage` key/value (`weather-app:theme-preference:v1`, storing `"ivory"`) is unchanged — only the CSS custom properties under `[data-theme="ivory"]` in `src/index.css` are redefined to the new palette from §1, and the `ThemePicker` label for that entry changes from "Ivory" to a name reflecting the new identity (see §3).

**Rationale**: `getThemePreference()`/`setThemePreference()`/`applyTheme()` (`src/services/theme.ts`) operate purely on the identifier string and never inspect its visual meaning. Any user who previously persisted `"ivory"` automatically gets the new palette the next time `applyTheme("ivory")` runs, with zero risk of a broken/missing reference (FR-003a is satisfied by construction, not by a migration step).

**Alternatives considered**: Introducing a new fourth identifier (e.g. `"vibrant"`) and deleting `"ivory"` — rejected because the spec clarification chose "replace," not "add," and reusing the identifier avoids writing a one-time migration for existing `localStorage` values.

## 3. Display name for the restyled theme

**Decision**: Rename the picker label from "Ivory" to **"Bright"** (identifier stays `"ivory"` internally, per §2). Update `THEMES` in `src/components/ThemePicker.tsx` label only.

**Rationale**: "Ivory" describes the old soft-cream palette and would mislabel the new vibrant one; a short, plain adjective ("Bright") matches the naming convention of the other two entries ("Midnight," "Glass" — single evocative word) without implying a specific brand.

**Alternatives considered**: Keeping the label "Ivory" — rejected, actively misleading once the palette is vibrant/high-saturation rather than ivory-toned. "Vibrant"/"Pop" — reasonable alternatives; "Bright" was chosen as the shortest, clearest single word consistent with the existing label style.

## 4. Theming Recharts chart chrome (grid, axes, tooltip, legend) — FR-004, FR-007

**Decision**: Style Recharts' generated SVG/DOM elements (grid lines, axis tick text, legend text, tooltip box) via CSS rules scoped under `[data-theme="..."]` in `src/index.css`, targeting Recharts' stable class names (`.recharts-cartesian-grid line`, `.recharts-cartesian-axis-tick-value`, `.recharts-legend-item-text`) plus a themed `contentStyle`/`itemStyle`/`labelStyle` object passed to `<Tooltip>` using CSS variable references (e.g. `backgroundColor: "var(--surface)"`) so the tooltip (which Recharts renders with inline styles, not a targetable class for background) still tracks the active theme. No new charting library or dependency is introduced.

**Rationale**: This keeps the existing "no theming library" decision from `001-weather-history-locations` §14/§15 (theme = CSS custom properties toggled via a `data-theme` attribute) and extends the exact same mechanism to the chart chrome, rather than introducing per-theme JS color lookups. CSS variables inside a JS style object (for the one part — `Tooltip`'s `contentStyle` — that Recharts renders as inline styles rather than a stylesheet-targetable class) are resolved live by the browser against the current `data-theme`, so no re-render/JS theme-detection logic is needed when the user switches themes.

**Alternatives considered**: A `useChartTheme()` hook reading `getComputedStyle` per theme change — rejected as unnecessary complexity; CSS variables referenced directly (via CSS rules for grid/axis/legend, and via `var(...)` strings in the one inline-style prop Recharts requires) achieve the same live-updating result with less code and no extra render logic.

## 5. Elevated visual treatment for chart series (bars/lines) — FR-004, FR-006

**Decision**: Add a subtle vertical gradient fill (`<defs><linearGradient>`) for the precipitation `<Bar>` in both the 24-hour and 7-day charts (replacing the current flat `fillOpacity={0.3}` fill), fading from the series' base color to transparent, and enable Recharts' built-in `activeDot` on the primary temperature `<Line>` so hovering highlights the active point. Existing per-series distinguishing techniques — distinct hues (`seriesColor`) and dash patterns (`seriesDash`) from `src/components/seriesColors.ts` — are kept unchanged (FR-006 already satisfied by the prior feature; this feature only adds visual polish on top).

**Rationale**: A gradient bar fill and an active-point highlight are the two lowest-risk, purely-visual "premium chart" conventions (used broadly in dashboard design per the Muzli dashboard-trends source in §1) that satisfy "more visually refined, premium presentation" (FR-004) without touching data, aggregation, or the existing accessibility-relevant distinguishing techniques (FR-006), and without adding a charting dependency beyond the already-adopted Recharts.

**Alternatives considered**: Switching `<Bar>`/`<Line>` to a full `<AreaChart>` with heavy gradient fills under every series — rejected as visually noisier with 6 possible series (FR-006's up-to-5-nearby-stations case) and more likely to reduce legibility (conflicts with FR-005); a gradient limited to the single precipitation bar per location keeps the "more series = more clutter" risk low.

## 6. Contrast/legibility verification method (FR-005, SC-004)

**Decision**: Verify the new theme's palette using WCAG 2.1 contrast-ratio calculations (4.5:1 minimum for normal text, 3:1 for large text/graphical objects) for each foreground/background pairing introduced in §1: `--text` on `--bg`, `--text` on `--surface`, `--accent` on `--bg`, and each of the six `SERIES_COLORS` (`src/components/seriesColors.ts`) against the new `--bg`/`--surface`. This check is done once during implementation (documented as a unit-testable assertion or a manual calculation recorded in the PR) rather than requiring a new automated accessibility-testing dependency.

**Computed results** (implementation-time check, Node.js WCAG relative-luminance formula):

| Pair | Ratio | Threshold | Result |
|---|---|---|---|
| `--text` (`#151316`) / `--bg` (`#fffdf9`) | 18.19:1 | 4.5:1 | Pass |
| `--text` / `--surface` (`#ffffff`) | 18.48:1 | 4.5:1 | Pass |
| `--text-muted` (`#6b6570`) / `--bg` | 5.56:1 | 4.5:1 | Pass |
| `--text-muted` / `--surface` | 5.64:1 | 4.5:1 | Pass |
| `--accent` (`#e01050`) / `--bg` | 4.74:1 | 4.5:1 (used for link/body text) | Pass |
| `--error-text` (`#7a0930`) / `--error-bg` (`#ffe3e8`) | 9.12:1 | 4.5:1 | Pass |
| `SERIES_COLORS[0]` `#2563eb` / `--bg` | 5.09:1 | 3:1 (graphical) | Pass |
| `SERIES_COLORS[1]` `#dc2626` / `--bg` | 4.75:1 | 3:1 | Pass |
| `SERIES_COLORS[2]` `#16a34a` / `--bg` | 3.24:1 | 3:1 | Pass |
| `SERIES_COLORS[3]` `#d97706` / `--bg` | 3.14:1 | 3:1 | Pass |
| `SERIES_COLORS[4]` `#7c3aed` / `--bg` | 5.61:1 | 3:1 | Pass |
| `SERIES_COLORS[5]` `#0891b2` / `--bg` | 3.62:1 | 3:1 | Pass |

All six existing series colors (unchanged, from `001-weather-history-locations`) clear the 3:1 graphical-object threshold against the new bright background without modification — no change to `seriesColors.ts` is needed. `--accent-2` (`#00d4b5` for the "Bright" theme) is used only as a decorative gradient-fill stop within a single series' own bar, never as an independent information-bearing distinguishing color, so the graphical-object contrast rule does not apply to it (data-model.md).

**Rationale**: The spec's edge cases and FR-005/SC-004 require legible text/series under the new theme; WCAG contrast ratio is the industry-standard, tool-agnostic way to verify this without adding a new test framework, consistent with `001-weather-history-locations`' existing scope (no new accessibility standard introduced, per that feature's Assumptions — this one just needs to keep meeting it under a different palette).

**Alternatives considered**: Adding an automated contrast-checking library/CI step — deferred as unnecessary scope for a single new palette; can be revisited if more themes are added later.
