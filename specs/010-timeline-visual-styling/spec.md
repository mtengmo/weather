# Feature Specification: Timeline Visual Styling from Mockup

**Feature Branch**: `010-timeline-visual-styling`

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: "Improve icons and diagram colors, use the colors from the screenshots. Try to do the page more like the screenshot with the 24h forecast."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Weather condition icons that read at a glance (Priority: P1)

A user scanning the timeline's condition row today sees plain single-color line-art icons. In the reference mockup (`docs/mockup/2331ca69-2535-4375-85c3-4461ef74ad01.png`), each condition is instantly recognizable from its own distinct, filled/colored icon (a warm yellow sun, a white/grey cloud, a pale moon, etc.) rather than a uniform outline glyph. The timeline's condition icons are restyled to be similarly distinct and colorful per condition, so a user can tell sun from cloud from rain from snow from moon without reading the text label underneath.

**Why this priority**: The condition row is the first thing scanned on the timeline and the mockup's biggest visual departure from today's implementation — highest visual-impact, most requested change.

**Independent Test**: Open the timeline for a 24-hour series with a mix of conditions (clear day, clear night, cloudy, rainy, snowy); confirm each condition's icon is visually distinguishable by color/fill, not just by shape, matching the reference mockup's use of warm yellow for sun, cool white/grey for cloud and moon, blue tones for rain, etc.

**Acceptance Scenarios**:

1. **Given** a timeline column showing a clear daytime hour, **When** it renders, **Then** the sun icon appears in a warm yellow/gold tone consistent with the mockup.
2. **Given** a timeline column showing a clear nighttime hour, **When** it renders, **Then** the moon icon appears in a distinct pale tone from the sun icon.
3. **Given** timeline columns showing cloudy, rainy, and snowy hours side by side, **When** they render, **Then** each condition's icon is distinguishable from the others by color as well as shape.
4. **Given** the app's existing theme switcher (Midnight/Bright/Glass), **When** the user switches themes, **Then** the condition icon colors remain legible and distinct against each theme's background.

---

### User Story 2 - Chart rows colored and shaded like the mockup (Priority: P1)

A user looking at the timeline's line and bar rows today sees every row rendered in the same single accent color. In the reference mockup, each metric has its own distinct color with a soft gradient fill beneath its line (a warm orange glow under the temperature line, a cool blue for precipitation bars), making it easy to tell rows apart at a glance and giving the temperature line in particular a visually rich, "weather app" feel. The timeline's rows are restyled with per-metric colors and (for line rows) a soft gradient fill under the line, matching the mockup's palette.

**Why this priority**: Equally central to the mockup's visual identity as the icons; directly requested ("diagram colors ... use the colors from the screenshots").

**Independent Test**: Open the timeline for a 24-hour series with full data; confirm the temperature row's line has a distinct warm color with a soft fill beneath it, the wind row uses its own distinct color, and the precipitation bars use their own distinct color — no two rows sharing the exact same color as each other or as the app's default single accent color used elsewhere in the UI.

**Acceptance Scenarios**:

1. **Given** the temperature row renders for a series with data, **When** viewed, **Then** its line is a distinct warm tone (matching the mockup's orange) with a soft gradient fill beneath it fading toward the row's baseline.
2. **Given** the wind row renders for a series with data, **When** viewed, **Then** it uses a distinct color from the temperature row's color.
3. **Given** the precipitation row renders for a series with data, **When** viewed, **Then** its bars use a distinct color from both the temperature and wind rows, consistent with the mockup's cool blue.
4. **Given** the forecast portion of any line row, **When** viewed, **Then** it remains visually distinguished from the observed portion (e.g. dashed/lighter) using the row's own color rather than reverting to a generic neutral tone.
5. **Given** any theme (Midnight/Bright/Glass) is active, **When** the timeline renders, **Then** the per-row colors stay legible against that theme's background (adjusted in tone if needed, but never blending into the background or becoming unreadable).

---

### User Story 3 - The "now" column reads as a highlighted marker (Priority: P2)

In the mockup, the current-hour column is visually emphasized: its header time/icon/values are tinted a distinct accent color, and the "now" line itself runs through the whole timeline in that same accent. Today's plain dashed grey line is easy to miss. The "now" column and its vertical marker are restyled to be more visually prominent and use a single consistent accent color, so a user immediately spots which column is "now" without hunting for the dashed line.

**Why this priority**: A smaller, self-contained visual change directly inspired by the mockup, layered on top of Story 1/2's per-row colors; useful on its own but less foundational than the icon/row color system.

**Independent Test**: Open the timeline for a series that has an observed/forecast boundary; confirm the "now" column's values are visually distinguished (e.g. via a distinct accent color) from every other column, and that the vertical "now" line uses that same accent color consistently across the whole timeline height.

**Acceptance Scenarios**:

1. **Given** a timeline with a "now" column, **When** it renders, **Then** that column's values across every row are shown in a distinct accent color, not the same neutral color as other columns.
2. **Given** the vertical "now" marker line, **When** it renders, **Then** it uses that same accent color rather than a plain grey/muted tone.
3. **Given** any active theme, **When** the "now" column and line render, **Then** the accent color remains legible against that theme's background.

---

### Edge Cases

- A condition with no established color mapping in the mockup (if any exist beyond sun/cloud/rain/snow/moon) falls back to a sensible color consistent with the rest of the new palette rather than reverting to the old single-tone icon style.
- The soft gradient fill under line rows must not reduce the legibility of that row's numeric value labels rendered beneath it.
- On the "Bright" (light) theme, colors and fills lifted from the mockup's dark-background palette are adapted in lightness/contrast as needed so they remain legible against a light background, rather than applied unchanged.
- This restyle does not reintroduce rows removed by other in-flight work (e.g. cloud cover, feels-like) — it only changes the color/icon treatment of whichever rows are currently rendered.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The timeline's condition-row icons MUST use distinct, per-condition colors (not a single uniform icon color) inspired by the reference mockup's palette (warm yellow for sun, cool white/grey for cloud and moon, blue tones for rain, white/pale-blue for snow).
- **FR-002**: The timeline's line-based rows (temperature and any other line rows retained by the current row set) MUST each use their own distinct color rather than sharing the app's single default accent color.
- **FR-003**: The temperature row specifically MUST render with a soft gradient fill beneath its line, fading from the line's color toward transparent at the row's baseline, matching the mockup's treatment.
- **FR-004**: The timeline's bar-based rows (precipitation and any other bar rows retained by the current row set) MUST each use their own distinct color, consistent with the mockup's palette (cool blue for precipitation).
- **FR-005**: Every row's forecast-vs-observed visual distinction (currently solid vs. dashed) MUST be preserved using that row's own new color rather than being replaced by a generic neutral tone.
- **FR-006**: The "now" column's values, across every row, MUST be rendered in a distinct accent color that differs from both observed and forecast column styling.
- **FR-007**: The vertical "now" marker line MUST use that same accent color consistently along its full height.
- **FR-008**: All colors introduced by this restyle (icons, row colors, gradient fills, now-column accent) MUST remain legible against the background of every existing theme (Midnight, Bright, Glass), adjusting shade/contrast per theme as needed.
- **FR-009**: This restyle MUST NOT change which rows are rendered or their data/layout — it is limited to color and icon treatment of the existing timeline structure.

### Key Entities

- **Condition Icon Palette**: A per-weather-condition color assignment (sun, cloud, rain, snow, moon, etc.) applied to the existing condition icons.
- **Metric Row Palette**: A per-metric-row color assignment (temperature, wind, precipitation, and any other currently-rendered line/bar rows) including each line row's gradient-fill treatment.
- **Now-Column Accent**: A single accent color applied to the "now" column's values and its vertical marker line, distinct from the row palette and from observed/forecast styling.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a side-by-side comparison, a user can correctly identify at least 4 out of 5 distinct weather conditions (clear day, clear night, cloudy, rainy, snowy) from icon color alone, without reading the text label.
- **SC-002**: A user glancing at the restyled timeline can correctly name which row is temperature, which is wind, and which is precipitation based on color alone, without reading the row title, in a usability spot-check.
- **SC-003**: The "now" column is identified correctly by a user within 2 seconds of glancing at the timeline, without needing to search for the dashed line as today.
- **SC-004**: All restyled colors pass a basic contrast/legibility check against each of the app's three themes (Midnight, Bright, Glass) — no restyled element becomes unreadable or blends into its background in any theme.

## Assumptions

- "The colors from the screenshots" refers to the palette visible in `docs/mockup/2331ca69-2535-4375-85c3-4461ef74ad01.png` (the "24H WEATHER" full-timeline mockup) — the second mockup image (`99a54f56-...png`, a set of alternative mobile/watch-face layouts) is treated as supplementary color/icon reference only, not a layout to also match, since "the screenshot with the 24h forecast" specifically calls out the first one.
- This feature restyles the timeline dashboard shipped in 008 (as already scoped for row-set changes by the separate 009 feature) — it does not restructure the header, add new rows, or change data logic; those are handled by other in-flight/prior features.
- The mockup's exact hex values are a visual reference to approximate, not an exact brand palette that must be pixel-matched — "distinct and mockup-inspired" is the bar, not exact color-matching, since the mockup is a design reference rather than a delivered asset.
- Icons continue to be sourced from the existing icon library/approach already used in the app; this feature changes their color treatment, not the underlying icon set or rendering mechanism.
