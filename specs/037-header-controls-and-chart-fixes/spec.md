# Feature Specification: Header Controls Cleanup and Chart Bug Fixes

**Feature Branch**: `037-header-controls-and-chart-fixes`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description:
"1. remove Display icon, move Midnight to Dark and Bright to Light, one button switch on header.
2. Move the rest to a new settings icon. Default to Not high/low.
3. The temp scale 0-10,20 doesn´t work. see screenshot
4. sometimes on web, at least on 3d, the right side doesn´t scale if zooming. alot of dead spaces. see other screenshot
the 24h works alot better with right-left panning"
Follow-up: "remove glass theme, doesn´t work good." — the existing third ("Glass") theme option is dropped entirely rather than relocated to Settings.
Follow-up: "also, add as specify, under the Details, default to 0 nearby stations." — the Details view's nearby-station-count control gets a new default.
Follow-up: a request to color-code the temperature graph by a 12-band temperature-to-color scale (≤ −20°C "Extreme cold" through ≥ +32°C "Extreme heat"), replacing today's single fixed line color, plus the question "is this good colors for the graph? how will that work?" (see Assumptions for how the two open design questions — banded-vs-gradient rendering, and light-theme contrast for the palest band — are being handled).
Follow-up: a revised, evenly-stepped 11-band table aligned to every 5 degrees (≤ −15°C through ≥ +35°C, reusing 11 of the original 12 colors and dropping the darkest "Extreme cold" shade), adopted in place of the original 12-band table so band edges land on the same round numbers as the temperature chart's own degree-scale gridlines (User Story 3).

Two screenshots were provided: one showing the temperature row's degree scale with a "20°" label at the top and a "0°" label at the bottom but no visible "10°" in between, and the gridlines appearing to touch the rows immediately above/below; one showing the 3-day timeline view with a large empty (dead) region to the right of the visible columns and a horizontal scrollbar, evidently captured after zooming the browser.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One-tap Dark/Light switch in the header (Priority: P1)

A dashboard viewer wants to switch between a dark and a light look without opening a menu first. Today, switching theme means opening the "Display" control, then picking "Midnight" or "Bright" from a list inside it. The viewer wants a single, always-visible button directly in the header that flips between "Dark" and "Light" in one tap.

**Why this priority**: Named first in the request and is the most frequently used control being reorganized — every other change in this feature builds around removing today's "Display" button.

**Independent Test**: Open the dashboard, confirm a single button in the header shows the current look and switches to the other one when pressed, with no intermediate menu step.

**Acceptance Scenarios**:

1. **Given** the dashboard is open, **When** the viewer looks at the header, **Then** there is no "Display" button, and instead a single button is visible that toggles between "Dark" and "Light".
2. **Given** the header's theme button currently reflects the dark look, **When** the viewer presses it, **Then** the app immediately switches to the light look and the button now reflects that.
3. **Given** the header's theme button currently reflects the light look, **When** the viewer presses it, **Then** the app immediately switches to the dark look and the button now reflects that.

---

### User Story 2 - Remaining display options behind a new Settings control (Priority: P2)

The options that used to live in the "Display" menu alongside theme (units, and whether the chart shows high/low markers) still need a home now that "Display" is gone. The viewer wants these moved to a new, separate "Settings" control in the header, wants high/low markers to be off by default for anyone who hasn't chosen a preference yet, and wants the existing third theme option ("Glass") removed entirely rather than kept anywhere, since it doesn't work well.

**Why this priority**: Directly depends on User Story 1 removing the old "Display" button — these options need a new home for that removal to be complete, but it's a secondary, less-frequently-used set of controls.

**Independent Test**: Open the dashboard as a new user (no saved preference), confirm high/low markers are off by default, confirm there is no way to select a "Glass" look anywhere in the app, then open the new Settings control and confirm units and the high/low toggle are available there and still work.

**Acceptance Scenarios**:

1. **Given** the dashboard is open, **When** the viewer looks at the header, **Then** there is a Settings control separate from the Dark/Light button.
2. **Given** the viewer opens the Settings control, **When** they look inside it, **Then** they find the unit choice (metric/imperial) and the high/low markers toggle, and no theme option of any kind (theme is fully covered by the header's Dark/Light button).
3. **Given** a viewer who has never changed the high/low markers setting, **When** they open the dashboard, **Then** high/low markers are hidden by default.
4. **Given** a viewer who previously turned high/low markers on, **When** they reopen the dashboard after this change, **Then** their own choice is respected (still on) — the new default only applies to viewers with no saved preference.
5. **Given** a viewer who had previously selected the "Glass" look, **When** they open the dashboard after this change, **Then** they see one of the two remaining looks (Dark or Light) instead — Glass is no longer an option anywhere in the app.

---

### User Story 3 - Correct, evenly-spaced temperature degree scale (Priority: P3)

A dashboard viewer looks at the temperature row's degree scale (the small numbers and horizontal reference lines next to the temperature line) and finds it unreliable: sometimes a step in the middle of the scale is missing, and the top/bottom reference lines visually run into the rows above and below instead of staying inside the temperature row.

**Why this priority**: A visible correctness bug reported from real use, but narrower in impact than the header reorganization above (it affects one row's readability, not navigation).

**Independent Test**: Open the dashboard's temperature row across several date ranges with different temperature spans (narrow, wide, spanning positive and negative) and confirm every expected step in the scale is shown, evenly spaced, and every reference line stays visually within the temperature row.

**Acceptance Scenarios**:

1. **Given** the temperature row is showing a range that spans multiple 10-degree steps, **When** the viewer looks at the scale, **Then** every step between the lowest and highest shown value is labeled — no step is silently skipped.
2. **Given** the temperature row's degree scale, **When** the viewer looks at the top and bottom reference lines, **Then** neither one visually overlaps the row above (Weather icons) or the row below (Precipitation), unlike the reported screenshot.

---

### User Story 4 - Timeline fills the available width when the browser is zoomed (Priority: P4)

A dashboard viewer on the web, using the 3-day (and potentially 7-day) view, zooms their browser in or out and finds a large empty region on the right side of the timeline instead of the columns resizing to fill the space — unlike the 24-hour view, which the viewer says already handles this well by staying pannable left-right regardless of zoom.

**Why this priority**: A layout bug affecting usability at non-default zoom levels; lowest priority here since it's a specific, less-common combination (particular view plus a non-default browser zoom).

**Independent Test**: Open the 3-day view on the web, change the browser's zoom level up and down, and confirm the timeline's columns and scrollable area resize to use the available width with no large empty region, behaving consistently with how the 24-hour view already behaves under the same zoom changes.

**Acceptance Scenarios**:

1. **Given** the 3-day view is open on the web, **When** the viewer changes the browser zoom level, **Then** the timeline's columns resize to use the available width instead of leaving a large empty region on the right.
2. **Given** the 3-day view under a changed zoom level, **When** the viewer needs to see columns that don't fit, **Then** they can pan left-right smoothly, consistent with how the 24-hour view already behaves.

---

### User Story 5 - Nearby stations off by default in Details (Priority: P5)

The Details view's "Nearby stations" control (how many nearby weather stations' readings are overlaid on the charts) currently starts new viewers off showing several nearby stations. The viewer wants this to default to showing none, so charts start out uncluttered until a viewer deliberately chooses to add nearby stations.

**Why this priority**: A single default-value change, the smallest and most isolated item in this feature — added last and lowest priority since it doesn't depend on or affect any other story here.

**Independent Test**: Open the Details view as a new viewer (no saved preference) and confirm the "Nearby stations" control starts at 0, with no nearby-station data overlaid on the charts until the viewer changes it.

**Acceptance Scenarios**:

1. **Given** a viewer who has never changed the "Nearby stations" setting, **When** they open the Details view, **Then** the control shows 0 and no nearby-station data is overlaid on the charts.
2. **Given** a viewer who previously chose a specific nearby-station count, **When** they reopen the Details view after this change, **Then** their own saved choice is respected — the new default only applies to viewers without a saved preference.

---

### User Story 6 - Temperature-banded coloring on the chart (Priority: P6)

Today the temperature line is drawn in a single fixed color regardless of how hot or cold it actually is. The viewer wants the line colored according to the actual temperature at each point, using a specific cold-to-hot color scale evenly stepped every 5 degrees, so a glance at the chart's color alone gives a sense of how cold or hot a period was — not just its shape — and so the color bands line up with the chart's own degree-scale gridlines (User Story 3).

**Why this priority**: A visual enhancement rather than a bug fix or reorganization, and the newest, least-scoped item in this feature — added last and lowest priority since it introduces new visual design work that other stories don't depend on.

**Independent Test**: View the temperature chart across a period that spans several bands (e.g., a cold night through a warm afternoon) and confirm the line's color changes according to this feature's band table as the temperature moves between bands, in both the Dark and Light look.

**Acceptance Scenarios**:

1. **Given** the temperature chart is showing a period whose values span multiple bands in the table below, **When** the viewer looks at the line, **Then** each portion of the line is colored according to the band its temperature value falls into.
2. **Given** a temperature value exactly at a band boundary (e.g., exactly −15°C or exactly +16°C), **When** the viewer looks at that point, **Then** it is colored using the band the table explicitly assigns that boundary value to (the colder of the two adjacent bands, per the table's own inclusive upper bound in each row).
3. **Given** the viewer switches between the Dark and Light look (User Story 1), **When** they look at the temperature line, **Then** every band's color remains clearly distinguishable from the chart's background and from its neighboring bands in both looks.

**Band table** (evenly stepped every 5 degrees, superseding an earlier 12-band draft — see Assumptions):

| Temperature | Band | Color |
|---|---|---|
| ≤ −15 °C | Very cold | `#327EAE` |
| −14 to −10 °C | Cold | `#4FA3C7` |
| −9 to −5 °C | Frost | `#82C4D8` |
| −4 to 0 °C | Around freezing | `#D9EEF2` |
| +1 to +5 °C | Cool | `#A8D5C0` |
| +6 to +10 °C | Mild | `#73BE8C` |
| +11 to +15 °C | Pleasant | `#C7D86A` |
| +16 to +20 °C | Warm | `#F2D45C` |
| +21 to +25 °C | Hot | `#F2A344` |
| +26 to +30 °C | Very hot | `#E8663D` |
| ≥ +31 °C | Extreme heat | `#C93636` |

---

### Edge Cases

- What happens to a viewer's already-saved theme preference (previously "midnight" or "ivory") after this change? It must still resolve to the correct one of the two header states (Dark for the former "Midnight", Light for the former "Bright") without the viewer having to reselect it.
- What happens to a viewer's already-saved "Glass" theme preference now that Glass is removed? The app must fall back to one of the two remaining looks (Dark or Light) rather than showing a broken or blank state.
- What happens when the temperature range for a period is very narrow (smaller than one 10-degree step)? The scale must still show at least the boundary values needed to cover that range, without skipping either one.
- What happens when the 3-day/7-day dead-space bug (User Story 4) occurs together with the temperature scale (User Story 3)? Each must be independently correct — fixing one must not depend on or interfere with the other.
- What happens to a temperature value more extreme than the table's own outer bounds (e.g., −25°C or +40°C)? It must still be colored, using the matching open-ended outer band ("Very cold" or "Extreme heat"), not left uncolored or clamped to a wrong band.
- What happens to the existing high/low markers, gridlines, and shaded fill under the temperature line once the line itself is band-colored? They must remain legible and not visually conflict with the new per-point line colors.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The header MUST NOT show a "Display" button/menu.
- **FR-002**: The header MUST show a single, always-visible button that switches between two states, labeled "Dark" (replacing "Midnight") and "Light" (replacing "Bright").
- **FR-003**: Pressing the header's Dark/Light button MUST immediately apply the other look and update the button to reflect the new current state.
- **FR-004**: The header MUST show a new Settings control, separate from the Dark/Light button, that a viewer can open to reveal the remaining display options.
- **FR-005**: The Settings control MUST include the existing unit choice (metric/imperial) and the existing high/low-markers toggle, both continuing to function as they did in the previous "Display" menu.
- **FR-005a**: The existing third theme option ("Glass") MUST be removed entirely — it MUST NOT be selectable from the header's Dark/Light button, the Settings control, or anywhere else in the app.
- **FR-005b**: A viewer whose previously saved theme preference was "Glass" MUST see the app fall back to one of the two remaining looks (Dark or Light) instead, rather than a broken or blank appearance.
- **FR-006**: For a viewer with no previously saved high/low-markers preference, the app MUST default to high/low markers hidden ("Not high/low").
- **FR-007**: A viewer's previously saved high/low-markers preference MUST be preserved and respected after this change (the new default applies only to viewers without a saved preference).
- **FR-008**: The temperature row's degree scale MUST label every step between its lowest and highest shown value — no intermediate step may be silently omitted.
- **FR-009**: The temperature row's top and bottom reference lines/labels MUST stay visually within the temperature row and MUST NOT overlap the rows immediately above or below it.
- **FR-010**: The 3-day (and 7-day) timeline view MUST resize its columns and scrollable area to use the available width when the browser's zoom level changes, rather than leaving a large empty region.
- **FR-011**: Left-right panning on the 3-day (and 7-day) view MUST remain smooth and usable across zoom levels, matching the existing 24-hour view's behavior.
- **FR-012**: For a viewer with no previously saved "Nearby stations" preference, the Details view MUST default that control to 0.
- **FR-013**: A viewer's previously saved "Nearby stations" preference MUST be preserved and respected after this change (the new default applies only to viewers without a saved preference).
- **FR-014**: The temperature chart MUST color each portion of the temperature line according to its actual value, using the band table in User Story 6, replacing today's single fixed line color.
- **FR-015**: A temperature value more extreme than the table's outer bounds MUST still be colored, using the matching open-ended outer band ("Very cold" for ≤ −15°C, "Extreme heat" for ≥ +31°C).
- **FR-016**: Every band's color MUST remain visually distinguishable from the chart's background and from its immediately neighboring bands in both the Dark and Light look.
- **FR-017**: The existing high/low markers, gridlines, and shaded fill on the temperature chart MUST remain legible once the line itself is band-colored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A viewer can switch between the dark and light look in a single tap, with zero intermediate menu steps, 100% of the time.
- **SC-002**: 100% of viewers opening the dashboard for the first time (no saved preference) see high/low markers hidden by default.
- **SC-002a**: 0% of viewers can reach a "Glass" appearance anywhere in the app after this change, including viewers who had it saved from before.
- **SC-003**: 100% of viewers with a previously saved high/low-markers preference see that same preference honored after this change ships.
- **SC-004**: Across a representative set of temperature ranges (narrow, wide, spanning zero), 100% of the expected degree-scale steps are visible and none of the top/bottom reference lines visually overlap an adjacent row.
- **SC-005**: On the 3-day and 7-day views, changing the browser's zoom level leaves no empty region wider than a single column's width on the right side of the timeline, across at least three different zoom levels tested.
- **SC-006**: 100% of viewers opening the Details view for the first time (no saved preference) see the "Nearby stations" control at 0 with no nearby-station chart overlays.
- **SC-007**: 100% of viewers with a previously saved "Nearby stations" preference see that same preference honored after this change ships.
- **SC-008**: For a period spanning at least 3 different bands, a viewer can identify, from color alone, which portions of the temperature line were colder versus warmer, in both the Dark and Light look.
- **SC-009**: None of the 12 band colors falls below standard text/graphic contrast guidance against the chart's own background, in either the Dark or Light look (flagging the palest band, "Around freezing," for explicit review — see Assumptions).

## Assumptions

- "One button switch on header" means a single toggle button showing the current look, not a two-button pair — pressing it always switches to the other state.
- The existing third theme option ("Glass") is removed entirely per explicit follow-up ("remove glass theme, doesn´t work good") — not relocated to Settings, not kept as a hidden/advanced option. A viewer who falls back from a saved "Glass" preference (see Edge Cases/FR-005b) defaults to Dark, matching the app's existing overall default theme.
- "The rest" moving to Settings means the unit toggle and the high/low-markers toggle (the other two controls previously inside "Display") — theme is now fully covered by the header's own Dark/Light button and has no presence in Settings.
- The temperature-scale bug (User Story 3) is being reported and scoped here from the screenshot's visible symptoms (a skipped middle step, edges overlapping neighboring rows); the underlying cause is left to be diagnosed during planning rather than prescribed here.
- The zoom/dead-space bug (User Story 4) is scoped to the 3-day view as explicitly reported, extended to the 7-day view as well since both use the same multi-day timeline layout (as opposed to the unaffected 24-hour view, which uses its own scroll behavior already called out as working well).
- This feature only reorganizes existing header controls and fixes two existing visual bugs — it does not add any new preference, unit, or theme beyond what already exists today.
- The "Nearby stations" default change (User Story 5) only affects the Details view's existing control (already offering values 0-4); this feature does not change where that control lives or how it behaves beyond its starting value.
- The color scale is a reasonable, conventional cold-to-hot meteorological scale (blue → green/yellow-green → orange/red). The user's first draft had 12 bands with an odd offset (the "Around freezing" band ran −4 to +1, nudging every warmer band's boundary off round multiples of 5); the adopted, revised table instead steps every 5 degrees exactly, dropping the darkest "Extreme cold" shade and merging its range into "Very cold" (now open-ended at ≤ −15°C) — chosen so band edges land on the same round numbers as the chart's own degree-scale gridlines (User Story 3), at the cost of one fewer distinguishable cold-end shade and a extreme-heat threshold that now triggers at +31°C instead of +32°C.
- The revised table's boundary values (…, +26 to +30, ≥ +31) are read as a fully gap-free partition — every band's upper edge is exactly 5 more than the previous band's, with no unlabeled gap between "+30" and the open-ended top band. If a genuinely wider gap around the extreme-heat threshold was intended instead, that would need to be called out separately.
- Two open design questions from this table are called out for planning/visual QA rather than resolved here: (1) whether the line renders as discrete band-colored segments (each point takes its band's flat color — simpler, reads as clear "zones") or as a smoothly interpolated gradient between band colors (more polished, harder to keep exact at boundaries) — defaulting to discrete band segments per FR-014/Acceptance Scenario 1's per-point wording, since it's the more literal reading of "colored according to the band"; (2) the palest band ("Around freezing," `#D9EEF2`) may have weak contrast specifically against a light background, so SC-009 calls this band out for explicit contrast verification once the Light look (User Story 1) exists, with a fallback (e.g., a darker outline/stroke on that segment) left as an implementation decision if the plain fill color doesn't pass.
- "The graph" is read as applying to every place the app charts temperature over time (both the dashboard's timeline row and the Details view's temperature chart), for visual consistency across the app, rather than only one of the two.
