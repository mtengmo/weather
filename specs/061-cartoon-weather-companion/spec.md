# Feature Specification: Cartoon Weather Companion

**Feature Branch**: `061-cartoon-weather-companion`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "plan how to add a cartoon person close to the weather icon also. see example here: docs\weathericons\ do I miss something from Dalle? if so, please create a new prompt to use with dalle."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See how to dress from a glance at the character (Priority: P1)

A user opens the app to check today's weather. Next to the existing main weather icon, a small cartoon character is dressed appropriately for the current conditions — a raincoat and umbrella when it's rainy, a parka and scarf when it's freezing, shorts and sunglasses when it's hot and dry. The user immediately gets a "what should I wear" cue without reading any numbers.

**Why this priority**: This is the entire feature — a single always-visible companion illustration next to today's conditions. Everything else (broader coverage, graceful fallback) only matters once this baseline exists.

**Independent Test**: Load the Overview for a location with clear current temperature and precipitation data; confirm a character illustration renders next to the main weather icon, and that its outfit visibly matches the precipitation type (dry/rain/thunder/sleet/snow) and temperature band shown elsewhere on the card.

**Acceptance Scenarios**:

1. **Given** the current conditions are cold and snowing, **When** the Overview loads, **Then** the character next to the main weather icon is shown in winter/snow clothing appropriate to the cold band.
2. **Given** the current conditions are hot and dry, **When** the Overview loads, **Then** the character is shown in warm-weather clothing (e.g. summer wear) rather than a raincoat or parka.
3. **Given** the current conditions change from rainy to dry between two page loads, **When** the Overview reloads, **Then** the character's outfit updates to match the new conditions.

---

### User Story 2 - Consistent coverage across all weather/temperature combinations (Priority: P2)

A user checks the app across very different days and seasons — a scorching summer afternoon, a sub-zero winter morning, a thundery evening. In every case the character is dressed for that specific combination of precipitation type and temperature, not just a generic "rainy" or "cold" look.

**Why this priority**: Without full coverage, some conditions would show a mismatched or missing character, undermining the "glance and know how to dress" value US1 establishes.

**Independent Test**: Exercise the Overview with mocked conditions spanning each of the five precipitation categories (dry, rain, thunder, sleet, snow) crossed with each of the five temperature bands (below -20°C, -20 to 0°C, 0-15°C, 15-25°C, above 25°C); confirm each combination renders a distinct, appropriately-dressed character.

**Acceptance Scenarios**:

1. **Given** any of the 25 supported precipitation × temperature combinations, **When** the Overview loads with those conditions, **Then** the character shown is the specific illustration matching that combination.
2. **Given** a thunderstorm at a mild temperature, **When** the Overview loads, **Then** the character reacts to the thunder (e.g. startled/ducking) rather than showing a plain rain outfit.

---

### User Story 3 - Graceful behavior when conditions can't be classified (Priority: P3)

A user opens the app for a location or moment where the underlying weather data is incomplete (e.g. temperature missing, or the condition can't be classified). The page still looks correct — the existing weather icon and text are unaffected, and no broken image or blank gap appears where the character would be.

**Why this priority**: A visual defect (broken image icon, layout shift) on incomplete data would be more damaging than simply omitting the character — this is a safety net, not new value.

**Independent Test**: Render the Overview with a condition or temperature deliberately left undetermined; confirm the main weather icon renders as it does today, no character image element is shown, and no layout shift or console error occurs.

**Acceptance Scenarios**:

1. **Given** the current condition cannot be classified into a WeatherCondition, **When** the Overview loads, **Then** no character illustration is shown and the rest of the card renders exactly as it does today.
2. **Given** a valid condition but a missing current temperature, **When** the Overview loads, **Then** the character falls back to the temperature band implied by today's forecast high/low rather than disappearing outright.

---

### Edge Cases

- What happens when the current temperature sits exactly on a band boundary (e.g. exactly 0°C or exactly 25°C)? Banding follows the same inclusive/exclusive convention already implied by the reference character matrix (a boundary value belongs to the warmer of its two adjacent bands).
- What happens if a character illustration asset is missing or fails to load? The character is simply omitted (falls back to no-character, not a broken-image icon), matching User Story 3.
- How does the character behave for `windy` conditions, which aren't part of the five precipitation categories? It falls back to the dry-category character for the matching temperature band, since `windy` has no dedicated art in the reference guide.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Overview MUST display a cartoon character illustration positioned directly beside today's primary current-conditions weather icon.
- **FR-002**: The character's clothing/pose MUST reflect the current precipitation category — dry, rain, thunder, sleet, or snow.
- **FR-003**: The character's clothing/pose MUST further reflect the current temperature band — below -20°C, -20 to 0°C, 0-15°C, 15-25°C, or above 25°C.
- **FR-004**: The system MUST use one of a fixed, pre-produced set of character illustrations (one per precipitation category × temperature band combination) rather than generating artwork at runtime.
- **FR-005**: The system MUST omit the character (while leaving the rest of the card unaffected) whenever the current conditions can't be mapped to a supported precipitation category or temperature band, rather than showing a broken image.
- **FR-006**: The character illustration MUST NOT obscure or crowd the existing temperature, high/low, or description text on the card.
- **FR-007**: Loading the character illustration MUST NOT introduce any additional network request beyond the app's existing bundled assets (same approach as the existing weather icon artwork).

### Key Entities

- **Character Variant**: One pre-produced illustration keyed by precipitation category (dry, rain, thunder, sleet, snow) and temperature band (below -20°C, -20 to 0°C, 0-15°C, 15-25°C, above 25°C) — 25 combinations total, matching the existing reference guide at `docs/weathericons/vaderikoner-promptguide.md`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can determine, purely by looking at the character's outfit (no text read), whether current conditions call for a coat, rain gear, or summer clothing, for at least 90% of real-world condition combinations encountered.
- **SC-002**: The character renders correctly (matching illustration, no broken image) for 100% of the 25 supported precipitation × temperature combinations.
- **SC-003**: Adding the character causes no measurable increase in the Overview's load time, since all artwork ships with the existing app bundle.

## Assumptions

- The character appears once, next to the single primary/hero weather icon already shown for "today" (the most prominent current-conditions icon on the Overview) — not repeated next to every hour/day icon in the timeline strip, which would be visually noisy across 24-30 columns. This matches the reference guide's own framing of the character as a companion to a single hero icon.
- The 25 character illustrations referenced in `docs/weathericons/vaderikoner-promptguide.md` are produced ahead of time as static image assets (via an image-generation tool) and bundled into the app the same way the existing 31 SMHI weather-icon images already are — not generated live per request.
- The character's outfit does not vary by day/night, only by precipitation category and temperature band — matching the reference guide, which defines no day/night axis for the character (only the background weather icon has day/night variants).
- Precipitation category classification (dry/rain/thunder/sleet/snow) reuses this app's existing weather-condition/SMHI-code classification rather than introducing a new taxonomy.
- Temperature band thresholds match the reference guide exactly: below -20°C, -20 to 0°C, 0-15°C, 15-25°C, above 25°C.
