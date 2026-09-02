# Research: Timeline Visual Styling from Mockup

## §1. Palette extraction from the reference mockup

**Decision**: Approximate (not pixel-match, per spec Assumptions) the mockup's palette as a set of
new theme-scoped CSS custom properties, one per weather condition and one per metric row:

| Token | Purpose | Midnight (dark) | Bright/`ivory` (light) | Glass |
|---|---|---|---|---|
| `--wx-sun` | clear-day icon | `#f6c453` (warm gold) | `#c78a1f` (deeper amber, legible on white) | `#facc15` |
| `--wx-moon` | clear-night icon | `#cbd0dc` (pale slate) | `#7d8494` (mid slate, legible on white) | `#dbe4ff` |
| `--wx-cloud` | cloudy icon | `#9aa3b5` | `#6b7280` | `#a9b6d9` |
| `--wx-rain` | rainy icon | `#5b9bd9` (sky blue) | `#2f72b8` | `#7dd3fc` |
| `--wx-snow` | snowy icon | `#dbe9f7` (pale ice) | `#4a90c2` (darker so it's visible on white) | `#e0f2ff` |
| `--wx-windy` | windy icon | `#8a93a6` | `#5b6472` | `#9fb0d0` |
| `--row-temperature` | temperature line + gradient | `#f2924a` (warm orange) | `#c1590f` | `#fb923c` |
| `--row-wind` | wind row text/arrow | `#4fb0a6` (teal) | `#2f7a72` | `#67e8f9` |
| `--row-precipitation` | precipitation bars | `#5b9bd9` (cool blue) | `#2f72b8` | `#7dd3fc` |
| `--row-cloud` | cloud-cover line | `#9aa3b5` | `#6b7280` | `#a9b6d9` |
| `--row-feelsLike` | feels-like line | `#e0a24a` (muted amber, distinct from temperature's more saturated orange) | `#a86b1a` | `#fbbf24` |
| `--row-snow` | snow bars | `#dbe9f7` | `#4a90c2` | `#e0f2ff` |
| `--row-gust` | gust bars | `#4fb0a6` (same family as wind, since gust is wind-adjacent) | `#2f7a72` | `#67e8f9` |
| `--now-accent` | "now" column values + marker line | `#5fd0ff` (bright cyan-blue, matching the mockup's blue "NOW" highlight) | `#0369a1` | `#7dd3fc` |

**Rationale**: The mockup (`docs/mockup/2331ca69-...png`) uses a warm orange temperature line with
a soft gradient fill, a cool blue precipitation bar, a teal-green wind fill (visible in the second
reference image's wind chart), and a bright blue "NOW" highlight against a dark navy background.
Reproducing these as CSS custom properties (rather than inline hardcoded colors) keeps them
themeable — each theme block gets its own values, satisfying FR-008's per-theme legibility
requirement without duplicating logic in JS.

**Alternatives considered**:
- *Reuse `--accent`/`--accent-2` for the new row colors* — rejected: those are already the app's
  single default accent pair (spec's own framing: "no two rows sharing... the app's default single
  accent color used elsewhere in the UI", User Story 2 Independent Test) — reusing them would
  violate that requirement.
- *One global palette shared across all three themes* — rejected: Edge Cases explicitly calls out
  that the mockup's dark-background palette needs adapting for the light "Bright" theme; a single
  shared palette would fail FR-008 on `ivory`.

## §2. Which column is "the now column" (FR-006/FR-007)

**Decision**: The now column is the first forecast period — i.e., `periods[nowBoundaryIndex + 1]`
— the same period the existing `.weather-timeline-now` vertical line is positioned immediately
before (`nowLeftPercent` in `WeatherIconOverview.tsx` is computed from `nowBoundaryIndex + 1`
already). Add a `weather-timeline-now-column` class to that period's cell in every row.

**Rationale**: Hourly/daily bucketing rarely produces a column that lands exactly on the current
instant — "now" always falls *between* the last observed and first forecast column. The existing
vertical marker line is already positioned at that exact boundary (research reused from 008's
`nowLeftPercent` calculation), so visually anchoring the "now column" styling to the column
immediately after that line reads as the same "here's where we are" moment the mockup conveys,
without inventing a new boundary concept.

**Alternatives considered**:
- *Highlight the last observed column instead* — rejected: the forecast side is what a user is
  about to look at next; the mockup's own "10 / NOW" column sits at the transition, leaning
  forward into the forecast, not backward into history.
- *Highlight both boundary columns* — rejected: spec FR-006 says "the now column" (singular); two
  highlighted columns would dilute the "identify it within 2 seconds" success criterion (SC-003)
  by giving the user two candidates to scan instead of one unambiguous marker.
- *No highlighted column when `nowBoundaryIndex` is null (no forecast data)* — kept: when there's
  no forecast boundary, there is no well-defined "now column" to highlight; the existing
  `nowLeftPercent`/`.weather-timeline-now` line already doesn't render in that case either, so the
  new styling simply follows the same existing null-check, adding no new edge case.

## §3. Testing approach for color-only changes

**Decision**: Integration tests assert class-name presence (e.g., a `clear-day` condition cell
carries a `weather-condition-clear-day` class, the temperature row's container carries
`weather-timeline-row-temperature`, the now-column cell carries `weather-timeline-now-column`) —
not computed CSS color values.

**Rationale**: This repo's established, already-documented limitation (008 quickstart.md,
011 research.md precedent) is that jsdom's `<ResponsiveContainer>`/style-computation stack cannot
reliably assert real rendered colors; structural class-presence assertions are the established
substitute, paired with a manual Playwright screenshot pass across all three themes in the Polish
phase (matching 008/011's own polish-phase pattern) to actually verify legibility and color intent.

**Alternatives considered**:
- *Assert `getComputedStyle(...).color` in jsdom* — rejected: jsdom's CSS engine does not load
  external stylesheets by default in this project's Vitest setup, and prior features in this repo
  never rely on it for this reason.

## §4. Where to define the per-condition and per-row classes

**Decision**: Add the condition class to the icon wrapper already rendered in `ConditionRow`
(`.weather-timeline-condition`, gains a second class `weather-condition-${condition}`) and add a
row-key class to each row's outer container in `LineRow`/`BarRow`/`WindRow`
(`weather-timeline-row-${row.key}`, reusing the `TimelineRow.key` values already present:
`temperature`, `wind`, `precipitation`, `cloud`, `feelsLike`, `snow`, `gust`).

**Rationale**: `row.key` already exists on every `TimelineRow` (`timelineData.ts`) and uniquely
identifies each row — reusing it as a CSS class name suffix needs no new data, just a template
string in the three render functions that already exist.

**Alternatives considered**: *Add a new `color` field to `TimelineRow`/`TimelineRowPoint`* —
rejected: would blur the existing clean separation between `timelineData.ts` (pure data shaping,
no visual concerns) and the component/CSS layer (all visual concerns) established since 008; a CSS
class keyed off the row's own existing `key` achieves the same result without crossing that layer.
