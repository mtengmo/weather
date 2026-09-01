# Phase 0 Research: Combined Weather Icon Overview

## 1. Icon set/library choice (FR-006)

**Decision**: Use `lucide-react` as a new npm dependency for the six weather icons (`Sun`, `Moon`, `Cloud`, `CloudRain`, `CloudSnow`, `Wind`).

**Rationale**: Verified live during planning (not assumed): `npm view lucide-react version` confirms it's a real, actively-maintained, current package (1.39.0); downloading its published type declarations (`unpkg.com/lucide-react@1.39.0/dist/lucide-react.d.ts`) confirms it exports every icon this feature needs under exactly those names, plus optional bonus icons (`CloudSun`, `CloudMoon`, `CloudRainWind`) that could support a future "partly cloudy" nuance without adding a second icon source. Lucide is a widely-used, MIT-licensed fork of the Feather icon set with a consistent line-art visual style — satisfying FR-006's "immediately recognizable, conventional" requirement by construction, rather than requiring custom SVG design work this app has no existing capability for. It ships as tree-shakeable individual React components (not a font or sprite sheet), so only the ~6 icons actually used are bundled.

**Alternatives considered**:
- *Hand-drawn/custom SVG icons*: Rejected — higher effort, and directly risks FR-006 (custom shapes are less likely to be "immediately recognizable" than an established convention).
- *`react-icons`*: A larger, well-known alternative bundling many icon sets (including a dedicated "Weather Icons" set with sun/cloud/rain/snow glyphs). Considered but not chosen — its weather-specific set has a busier, more skeuomorphic style than this app's existing clean/minimal aesthetic (visible in the existing chart UI), whereas Lucide's simple line-art matches it more closely and needs no extra sub-package selection.
- *Emoji characters (☀️🌙☁️🌧️💨❄️)*: Rejected — rendering is font/OS-dependent (inconsistent appearance across platforms), and accessibility/sizing control is worse than a real SVG component.

## 2. Deriving one condition from four metrics (FR-002, FR-005)

**Decision**: A pure function takes one period's `temperature`, `precipitation`, `windSpeed`, `cloudCoverPercent` (plus, for the hourly view, its timestamp for day/night) and returns one of six conditions, evaluated in this fixed priority order (matching spec Assumptions):

1. **No data** — `temperature === null && precipitation === null` (reusing the exact gap-detection rule already used in `ObservationDetails.tsx`/`chartData.ts`, rather than a new one).
2. **Snowy** — `precipitation` is a positive number **and** `temperature` is at or below freezing (0°C / 32°F, converted per the active unit system).
3. **Rainy** — `precipitation` is a positive number (and not classified snowy above).
4. **Windy** — `windSpeed` meets or exceeds a "noticeably windy" threshold (≈8 m/s, the Beaufort-scale "Fresh Breeze" boundary — commonly where loose paper/small branches move, a recognizable everyday reference point).
5. **Cloudy** — `cloudCoverPercent` is at or above 50% (the conventional midpoint between "partly" and "mostly" cloudy in standard cloud-cover terminology).
6. **Clear** — none of the above; day or night determines `Sun` vs. `Moon` (research.md §3).

**Rationale**: A single ordered chain of cheap comparisons is simple, fully deterministic, and easy to unit test exhaustively (one test per priority level, plus boundary cases). Reusing the existing gap-detection rule (rather than requiring *all four* fields to be null) matches how the rest of the app already treats "no meaningful reading" and avoids a second, subtly different definition of "missing data" existing side by side with the first.

**Alternatives considered**:
- *Require all four fields null for "no data"*: Rejected — the existing convention already treats a temperature+precipitation gap as the meaningful "nothing usable here" signal even when, say, a stale wind reading happens to be present; diverging from that would be a second, inconsistent definition.
- *Weighted/scored multi-condition blending (e.g., "60% cloudy, 40% rainy")*: Rejected — spec FR-005 explicitly calls for exactly one unambiguous icon per period, not a blend.

## 3. Day vs. night (FR-003)

**Decision**: A fixed local-clock-hour rule — a period's timestamp is "night" when its local hour falls outside 06:00–20:00 (i.e., before 6am or at/after 8pm), otherwise "day". Applies only to the hourly (24h) view; daily (7-day) periods always use the `Sun` icon for a clear condition, since a whole day inherently spans both day and night and picking one icon to represent "today was clear" is clearer with the sun than an arbitrary day/night call for the whole 24h span.

**Rationale**: Matches spec Assumptions (a simple, consistent rule, not sunrise/sunset calculation the app has no data source for). A fixed 06:00–20:00 window is a reasonable, unsurprising default for most latitudes/seasons without adding complexity; it can be revisited later if real sunrise/sunset data is ever sourced (e.g., alongside the existing SMHI/Open-Meteo calls).

**Alternatives considered**:
- *Sunrise/sunset calculation (e.g., via a formula or a new API)*: Rejected for this feature — a materially bigger scope addition (new calculation or dependency) for a cosmetic refinement spec Assumptions already said not to require.
- *Applying day/night to the 7-day view too (e.g., half-moon icon for "today")*: Rejected — adds a second, less-intuitive icon meaning ("this whole day was on average more night than day"?) for marginal benefit; the hourly view already carries the day/night distinction where it's meaningful.

## 4. Distinguishing forecast periods (FR-007)

**Decision**: Reuse the existing `isForecast` flag already present on `WeatherObservation`/`DailyAggregate` (005/006) — a forecast period's icon is rendered with the same visual treatment already established for forecast chart segments (reduced opacity, consistent with 005's `fillOpacity={0.45}`/006's `strokeOpacity={0.5}` conventions), plus a text label (e.g., "Forecast") for accessibility, rather than color/opacity alone.

**Rationale**: Consistency with the app's existing forecast visual language (established across 005 and 006) means users who already understand "lighter = predicted" on the charts immediately understand it here too, with no new convention to learn.

**Alternatives considered**:
- *A distinct forecast-only icon style (e.g., dashed icon outline)*: Rejected — SVG icon components from `lucide-react` don't offer a built-in "dashed" stroke variant without custom SVG editing, and it would be a new visual convention not used anywhere else in the app.

## 5. Responsive, screen-filling layout (FR-011)

**Decision**: A CSS grid (`display: grid; grid-template-columns: repeat(auto-fit, minmax(...))`) for the icon periods, inside a container that's allowed to grow with the viewport rather than the charts' fixed `height={320}` — no new dependency, pure CSS addition to `src/index.css` alongside the existing theme variables.

**Rationale**: `auto-fit`/`minmax` is a standard, well-supported CSS Grid pattern for "as many columns as fit the available width, each no smaller than X" — it directly satisfies FR-011's "scale to the screen, stay legible when resized" without JavaScript-driven layout logic or a new charting/layout library.

**Alternatives considered**:
- *Flexbox with manual breakpoints*: Rejected — more media-query bookkeeping for materially the same result `auto-fit`/`minmax` gives for free.
- *A dedicated responsive-grid library*: Rejected — unnecessary; native CSS Grid already does this without adding a dependency.
