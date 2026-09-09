# Feature Specification: Humidity Level Indicator

**Feature Branch**: `050-show-humidity-level`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "could we add a humidy graph? or just estimate/add that level? Like Dry, Normal, High humiday as some information? I see we have relative_humidity from smhi" — follow-up scoping: start with the simple level indicator (not a full graph tab).

Context: Relative humidity is already a field the app's data model carries (`WeatherObservation.relativeHumidity`) and is already fetched from MET Norway and Open-Meteo — today it's used only internally, as an input to the "feels like" temperature calculation, never shown to the viewer directly. SMHI, the app's primary source, doesn't populate this field at all yet, even though SMHI's own forecast data already includes a `relative_humidity` percentage, and SMHI's station-observation data has an equivalent hourly measured parameter. This feature surfaces humidity as a simple, everyday-readable level — Dry / Normal / High — rather than a full graph, as a lighter-weight first step.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See today's humidity at a glance (Priority: P1)

A viewer looking at their location's "Today" summary sees a simple humidity level — Dry, Normal, or High — alongside the other everyday conditions already shown there (temperature, rain, wind).

**Why this priority**: This is the entire request — give a quick, plain-language read on humidity without requiring the viewer to interpret a raw percentage or open a new view.

**Independent Test**: Mock a location with a known current relative-humidity reading in each of the three bands; confirm the Today card shows the corresponding level (Dry/Normal/High).

**Acceptance Scenarios**:

1. **Given** a location with a low current relative humidity, **When** the viewer looks at the Today card, **Then** it shows "Dry".
2. **Given** a location with a moderate current relative humidity, **When** the viewer looks at the Today card, **Then** it shows "Normal".
3. **Given** a location with a high current relative humidity, **When** the viewer looks at the Today card, **Then** it shows "High".
4. **Given** no humidity reading is available for the location, **When** the viewer looks at the Today card, **Then** nothing about the card changes from today (no broken or empty humidity line).

---

### User Story 2 - SMHI locations get humidity too, not just MET Norway/Open-Meteo ones (Priority: P1)

A viewer at a location whose primary data source is SMHI sees a humidity level the same as anywhere else, instead of the feature only working for locations served by the other two sources.

**Why this priority**: SMHI is the app's primary source and covers the largest share of locations (Sweden) — without this, the feature would silently not work for most users, which defeats the purpose.

**Independent Test**: Mock an SMHI-sourced observation/forecast period with a humidity value; confirm the resulting `WeatherObservation` carries it and the Today card reflects it, the same as for a MET Norway or Open-Meteo location.

**Acceptance Scenarios**:

1. **Given** an SMHI forecast period, **When** its data is loaded, **Then** its relative humidity is captured and used the same way MET Norway's and Open-Meteo's already are.
2. **Given** an SMHI station observation (actual measured, not forecast), **When** its data is loaded, **Then** its relative humidity is captured too.

---

### Edge Cases

- What determines "today's" humidity level shown on the Today card — the current moment's reading, or a whole-day average? Humidity swings meaningfully through a day (e.g. damp mornings, drier afternoons), so a single day-average would be a less meaningful "right now" read — the level reflects the most recent available reading, falling back to a day-level estimate only when there's no current reading yet (mirroring how the card's existing condition/description already prefers "right now" over a day average).
- What happens at the boundary between two bands (e.g. exactly the cutoff between Dry and Normal)? Falls into the higher of the two adjoining bands, consistently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: SMHI-sourced forecast periods MUST carry a relative humidity value, using the same field already populated by the app's other two data sources.
- **FR-002**: SMHI-sourced station observations (actual measured periods, not forecasts) MUST carry a relative humidity value.
- **FR-003**: The Today card MUST show a humidity level — Dry, Normal, or High — derived from the location's most recent available relative-humidity reading.
- **FR-004**: When no relative-humidity reading is available for a location, the Today card MUST render exactly as it does today, with no humidity line and no error.
- **FR-005**: The three humidity bands MUST be applied consistently regardless of data source.

### Key Entities

- **Humidity level**: A three-value classification (Dry / Normal / High) derived from a raw relative-humidity percentage, shown in place of (or alongside) the raw number for everyday readability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of locations with an available relative-humidity reading — regardless of which of the three data sources serves them — show a humidity level on the Today card.
- **SC-002**: 0 regressions to the Today card's existing content when no humidity reading is available.
- **SC-003**: The displayed level is verifiably consistent with the underlying percentage and its defined band, for all three bands.

## Assumptions

- Band thresholds: below 30% relative humidity reads "Dry", 30-70% reads "Normal", above 70% reads "High" — standard, commonly-used bands for everyday (non-specialist) humidity communication; exact cutoffs are a planning-level detail, not a scope decision.
- "Simple level only" (this feature) intentionally excludes a full humidity graph/tab/Details-table column — that remains a possible separate follow-up feature, not part of this one.
- The Today card is the right home for this, consistent with how it already surfaces other everyday-readable conditions (temperature, rain, wind, sunrise/sunset) rather than raw metric detail.
