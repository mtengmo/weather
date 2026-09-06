# Feature Specification: MET Norway Forecast Source & Richer Conditions

**Feature Branch**: `022-met-forecast-source`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "could you add https://api.met.no/ as a weather forecast togheter with smhi ? I guess you have a time generated for it. 2. what part from smhi are you missing that could be important? [pasted SMHI forecast parameter sample: air_temperature, wind_from_direction, wind_speed, wind_speed_of_gust, relative_humidity, air_pressure_at_mean_sea_level, visibility_in_air, thunderstorm_probability, probability_of_frozen_precipitation, cloud_area_fraction, low/medium/high_type_cloud_area_fraction, cloud_base_altitude, cloud_top_altitude, precipitation_amount_mean_deterministic, precipitation_amount_mean, precipitation_amount_min, precipitation_amount_max, precipitation_amount_median, probability_of_precipitation, precipitation_frozen_part, predominant_precipitation_type_at_surface, symbol_code]. 3. the colors of the icons for 7d forecast is not working. improve it. 4. what icons do you support for weather? 5. could we have more colors that describe the weather? 6. the difference forecast sources, could they have an option to be on different series?"

## Clarifications

### Session 2026-09-06

- Q: Where should the new "view forecast sources separately" option live? → A: Overview and Details — a compact per-source indicator on the main Overview timeline in addition to a full per-source toggle on the Details/graph view.
- Q: Should the expanded set of weather conditions/colors apply everywhere icons appear, or only where it matters most? → A: Everywhere — main timeline, 7-day strip, and the Details table's Condition column all use the same expanded condition vocabulary.
- Q: Should the footer credit MET Norway when it contributes to the forecast? → A: Yes, extend the existing footer disclosure text to name MET Norway alongside SMHI/Open-Meteo when it's part of the blend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A third independent forecast source (Priority: P1)

A user wants the forecast to draw on MET Norway's public weather service as a third independent source, blended alongside SMHI and Open-Meteo the same way those two already are, with its own genuine "forecast generated at" time feeding the existing freshness disclosure.

**Why this priority**: More independent sources make the blended forecast more robust to any single source's gaps or outages, directly continuing the multi-source averaging work already shipped for two sources.

**Independent Test**: Load the dashboard for a location; confirm the forecast blend can include a contribution from MET Norway (verifiable by comparing a period's blended value against MET Norway's own published forecast for that location and time), and that MET Norway's own generation time is reflected in the freshness disclosure when it's the most relevant one to show.

**Acceptance Scenarios**:

1. **Given** a location with data available from all three sources, **When** a forecast period is shown, **Then** the displayed value reflects the blend of however many of the three sources actually have data for that period.
2. **Given** MET Norway is one of the sources contributing to the current forecast, **When** the freshness time is shown, **Then** it may reflect MET Norway's own genuine "generated at" time under the same rules already used for SMHI's.
3. **Given** MET Norway's service is unreachable or returns no data for a location, **When** the forecast is shown, **Then** the app degrades gracefully to blending whichever of the remaining sources succeeded, exactly as it already does when one of two sources fails today.

---

### User Story 2 - Fix the 7-day strip's broken icon colors (Priority: P1)

A user looking at the persistent 7-day forecast strip expects each day's condition icon to be colored the same way the main timeline's condition icons already are (sun in yellow/gold, rain in blue, snow pale blue, etc.), not a flat, uncolored icon.

**Why this priority**: A visible, easy-to-confirm regression-style defect — the main timeline already has a working per-condition color system that the 7-day strip never received, so today its icons look inconsistently flat next to the rest of the app.

**Independent Test**: Compare a day's icon color in the 7-day strip against the same condition's icon color on the main timeline; confirm they match.

**Acceptance Scenarios**:

1. **Given** a day in the 7-day strip has a clear, rainy, snowy, cloudy, or windy condition, **When** its icon is shown, **Then** it uses the same distinguishing color as that condition's icon on the main timeline, in every theme.

---

### User Story 3 - More distinguishable weather conditions, using data already available (Priority: P2)

A user wants the forecast to visually distinguish more kinds of weather than today's six broad categories (clear day/night, cloudy, rainy, windy, snowy) — for example thunderstorms, fog/mist, and sleet/mixed precipitation — using detail that SMHI, Open-Meteo, and MET Norway already provide but the app currently ignores (each source's own official weather-symbol code, plus fields like thunderstorm probability and precipitation type that are fetched from some sources but never used).

**Why this priority**: A genuine, valuable expansion once the color system itself is fixed (US2) and a third source is available (US1) — richer, more specific icons and colors make the forecast noticeably more informative, but it's an enhancement rather than a fix, so it follows the two P1 defect fixes.

**Independent Test**: Find a real forecast period showing a condition beyond today's six (e.g. thunderstorm, fog, or sleet); confirm it has its own distinguishable icon and color, consistently applied on the main timeline, the 7-day strip, and the Details table's Condition column.

**Acceptance Scenarios**:

1. **Given** a source's own weather-symbol code indicates a condition finer than today's six categories, **When** that period is classified, **Then** the app shows the more specific condition rather than collapsing it into a broader one.
2. **Given** no source's symbol code is available for a period, **When** that period is classified, **Then** the app falls back to today's existing threshold-based classification rather than showing no condition at all.
3. **Given** the expanded condition set is shown anywhere in the app, **When** the same underlying condition appears in the main timeline, the 7-day strip, or the Details table, **Then** it uses the same icon and color in all three places.

---

### User Story 4 - Compare forecast sources on separate series (Priority: P3)

A user curious about how much SMHI, Open-Meteo, and MET Norway actually agree wants an option to see each source's own forecast line instead of only ever seeing the single blended average.

**Why this priority**: A power-user/trust-building feature — the blended value remains the default and primary experience; this is an additional, optional way to inspect the same underlying data, not a replacement.

**Independent Test**: With a forecast period where multiple sources have data, switch to the per-source view; confirm each contributing source's own value is shown as its own distinguishable series, and switch back to confirm the default blended view is unchanged.

**Acceptance Scenarios**:

1. **Given** the Details/graph view is open on a metric with forecast data, **When** the user switches to a per-source view, **Then** each contributing source's forecast is shown as its own distinguishable series rather than a single blended line.
2. **Given** the Overview's main timeline, **When** multiple sources contribute to a forecast period, **Then** a compact indicator shows how many/which sources contributed, without requiring the user to leave the Overview.
3. **Given** the user switches back to the default blended view, **When** they do so, **Then** the Overview and Details continue to show the blended value exactly as they did before this feature, unaffected by having viewed the per-source breakdown.

---

### Edge Cases

- What happens when only one of the three sources has data for a period? The value shown is that single source's own reading, with no blended-source indicator — consistent with the existing rule that a blend is only indicated when one genuinely happened.
- What happens when a period's classification would need a symbol code but the source providing data for that period doesn't supply one? Falls back to the existing threshold-based classification for that period only, never inventing a symbol-code-derived condition without underlying data.
- What happens in the per-source comparison view when a source has no data for part of the range? That source's series shows a gap for that part, matching the app's existing gap-vs-fabrication behavior — never interpolated or invented.
- What happens to the freshness disclosure when more than one of the sources contributing to the current forecast has its own genuine timestamp? The most relevant genuine timestamp available continues to be shown, following the same precedence already established for SMHI vs. sync-time fallback.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST fetch a forecast from MET Norway's public weather service as a third forecast source, usable alongside SMHI and Open-Meteo.
- **FR-002**: When MET Norway contributes to the currently-shown forecast and its own genuine "forecast generated at" time is the most relevant one to show, the freshness disclosure MUST reflect that genuine time rather than the app's own sync time.
- **FR-003**: When two or more of the three sources have data for a forecast period, the displayed value MUST be the cross-source blended average of however many sources actually contributed, and any "blended" indication MUST reflect the true number of contributing sources.
- **FR-004**: The footer's data-source disclosure MUST name MET Norway alongside SMHI and/or Open-Meteo whenever it genuinely contributes to the current blended forecast, mirroring how the disclosure already names Open-Meteo's contribution.
- **FR-005**: The 7-day forecast strip's condition icons MUST use the same per-condition color as the main timeline's condition icons, in every theme.
- **FR-006**: The system MUST classify a forecast period's weather condition using that period's own source-provided official weather-symbol code when one is available, distinguishing more conditions than today's six categories (at minimum: thunderstorm, fog/mist, and sleet/mixed precipitation, in addition to the existing six).
- **FR-007**: When no source-provided symbol code is available for a period, the system MUST fall back to the existing threshold-based classification rather than leaving the period unclassified.
- **FR-008**: Every expanded weather condition MUST have its own distinguishable icon and color, applied consistently across the main timeline, the 7-day forecast strip, and the Details table's Condition column.
- **FR-009**: Users MUST be able to switch the Details/graph view to show each contributing forecast source as its own separate series, instead of only the blended average, without affecting what the Overview or Details show by default.
- **FR-010**: The Overview's main timeline MUST show a compact, always-visible indicator of how many/which sources contributed to a forecast period's value, without requiring the user to open any additional view.
- **FR-011**: None of the above changes may fabricate data — a period or value with no underlying data from any source continues to show the existing no-data indicator rather than an invented value or condition.

### Key Entities

- **Forecast Source**: One of three independent providers (SMHI, Open-Meteo, MET Norway) that can each independently supply forecast observations for a location, with their own forecast-generated timestamp where genuinely available.
- **Weather Condition**: An expanded set of distinguishable categories (beyond today's six) that a forecast period can be classified as, each with its own icon and color, derived preferentially from a source's own official weather-symbol code and falling back to the existing threshold-based rule otherwise.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A forecast period with data from at least two of the three sources shows a value that reflects all contributing sources, verifiable against each source's own independently-published data.
- **SC-002**: MET Norway's own forecast-generated time is shown in the freshness disclosure when it is the most relevant source to show, verified against MET Norway's own published data.
- **SC-003**: The 7-day strip's icon colors visually match the main timeline's icon colors for the same condition, in every theme, verified visually.
- **SC-004**: At least three additional distinguishable weather conditions beyond today's six are visible in the app within a week of typical variable weather, each with its own icon and color.
- **SC-005**: A user can switch to a per-source comparison view on the Details/graph view and back to the default blended view without losing their place or altering the Overview's default display.
- **SC-006**: The footer's disclosure names MET Norway whenever it genuinely contributes to the shown forecast, matching MET Norway's attribution requirement.

## Assumptions

- "A time generated for it" (User Story 1) refers to MET Norway's own forecast-response metadata, which includes a genuine "when this forecast data was generated" timestamp distinct from the app's own fetch-completion time — the same kind of value already threaded through for SMHI.
- The additional SMHI forecast fields the user asked about (relative humidity, air pressure, visibility, thunderstorm probability, precipitation type/probability, and the official weather-symbol code) are already available from SMHI's existing forecast response but currently unused by the app; this round adopts the weather-symbol code (for richer condition classification, US3) and thunderstorm/precipitation-type signals (to distinguish the new condition categories) as the most user-visible, high-value subset. Humidity, pressure, and visibility remain out of scope for this round as they don't map to a currently-missing user-facing feature (humidity is already fetched from Open-Meteo for the existing feels-like calculation; pressure and visibility have no current display slot) — a future round can add dedicated rows for these if wanted.
- "What icons do you support" (User Story 3 context) is answered by this feature directly expanding the supported icon/condition set — the answer becomes self-documenting via the expanded set introduced here rather than a separate reporting mechanism.
