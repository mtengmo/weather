# Feature Specification: Replace Weather Icons With Character Artwork

**Feature Branch**: `063-replace-weather-icons`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "new weathericons, with instructions in this foldeR: docs\weathericons replace the one we have today with these new ones, see instricitons in md file"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a character-illustrated weather icon everywhere the app shows one (Priority: P1)

A user looks at the app's Today card, the 24-hour/3-day/7-day timeline, and the 7-day forecast
strip. Everywhere the app currently shows a plain sun/cloud/rain-style icon, it instead shows a
piece of character artwork — a distinct character reacting to the current weather (dry, rainy,
thundery, sleety, or snowy) dressed for the current temperature, with the weather symbol (sun,
cloud, rain, snow, etc.) still clearly visible alongside them. The same kind of weather always
shows the same character, so the visual language becomes recognizable at a glance, not just
informative up close.

**Why this priority**: This is the entire ask — replacing the current icon artwork everywhere it
appears is the whole feature; nothing else in this spec matters without it.

**Independent Test**: Render the Today card and timeline for a location/time with a known SMHI
weather code and temperature; confirm the new character artwork appears (matching that code's
weather type and the current temperature band) instead of the old plain icon, for both a daytime
and a nighttime example.

**Acceptance Scenarios**:

1. **Given** the current conditions match any of the 27 recognized weather codes, **When** the
   Today card or timeline renders that period, **Then** it shows the character artwork for that
   code's weather type and the current temperature band, not the old plain icon.
2. **Given** the same weather code and temperature band occurs at two different places in the app
   (e.g. the Today card and a timeline column), **When** both are shown, **Then** they display the
   identical character artwork — the same weather always looks the same everywhere.
3. **Given** a period falls at night versus during the day, **When** its icon renders, **Then** the
   night version of the artwork is shown at night and the day version during the day, matching the
   app's existing day/night distinction.

---

### User Story 2 - Sensible fallback for combinations that don't occur in nature (Priority: P2)

A data source occasionally reports a technically-possible-but-unrealistic combination — for
example rain during a deep freeze, or snow during a warm afternoon. No character artwork exists for
these combinations (rain and snow realistically never occur at those temperatures), so the app
must still show something sensible rather than a missing or broken image.

**Why this priority**: A defect here (broken image, blank icon) would be jarring, but it only
affects rare, edge-of-reality data combinations — lower priority than the everyday case in User
Story 1.

**Independent Test**: Feed the icon-selection logic a rain-type weather code paired with a
below-freezing-range temperature band (and separately, a snow-type code paired with a warm
temperature band); confirm a defined, sensible piece of artwork renders in both cases rather than
nothing or a broken image.

**Acceptance Scenarios**:

1. **Given** the current weather code is a rain type and the current temperature band is one of
   the two coldest bands, **When** the icon renders, **Then** it shows the sleet-character artwork
   for that temperature band instead of a missing image.
2. **Given** the current weather code is a snow type and the current temperature band is one of
   the three warmest bands, **When** the icon renders, **Then** it likewise shows the
   sleet-character artwork for that temperature band instead of a missing image.

---

### User Story 3 - Icon still renders when temperature data is missing (Priority: P3)

A period being shown has a known weather code but, for whatever reason, no current temperature
reading available. The icon must still render using a sensible default temperature, rather than
disappearing or showing a broken image.

**Why this priority**: A safety net for incomplete data, not new day-to-day value — lowest
priority.

**Independent Test**: Render a period with a known weather code but no temperature value; confirm
the icon still renders (using a sensible default temperature band) rather than being omitted or
broken.

**Acceptance Scenarios**:

1. **Given** a period has a recognized weather code but no temperature reading, **When** its icon
   renders, **Then** it still shows character artwork for a sensible default temperature band
   rather than no icon at all.

---

### Edge Cases

- What happens when the current temperature sits exactly on a band boundary (-20°C, -5°C, 5°C,
  15°C, or 25°C)? It's treated as belonging to the warmer of the two adjacent bands, consistent
  with this app's existing convention for boundary temperatures elsewhere.
- What happens to weather codes that were previously visually distinct but now share one combined
  weather type (e.g. "light rain showers" and "light rain" both become the same "light rain"
  artwork)? This is an intentional simplification — the icon no longer distinguishes them, but the
  existing text description shown alongside the icon still does.
- What happens at the very small icon sizes used in the hourly timeline? The same artwork already
  used at the Today card's larger size is simply scaled down, the same way today's icons already
  scale across different display sizes in the app.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST replace the artwork shown at every existing place the app displays a
  weather icon (Today card, timeline, 7-day forecast strip, details table, and any other existing
  icon placement) with the new character-illustrated artwork.
- **FR-002**: The system MUST select the replacement artwork using the same weather-code
  information already driving today's icon choice, consolidated into 12 recognizable weather
  types that together cover all 27 existing weather codes.
- **FR-003**: The system MUST further select the replacement artwork by the current temperature,
  banded into 6 ranges: below -20°C, -20 to -5°C, -5 to 5°C, 5 to 15°C, 15 to 25°C, and above 25°C.
- **FR-004**: The system MUST show the correct day or night version of the artwork, matching the
  app's existing day/night distinction — no change to when a period counts as day versus night.
- **FR-005**: When the weather type is a rain type and the temperature band is one of the two
  coldest bands (below -5°C), or the weather type is a snow type and the temperature band is one
  of the three warmest bands (5°C and above), the system MUST show the sleet-type artwork for that
  temperature band instead, rather than a missing or broken image.
- **FR-006**: When no current temperature is available for a period, the system MUST fall back to
  a sensible default temperature band rather than omitting the icon.
- **FR-007**: This replacement MUST NOT change which underlying condition or temperature data
  drives icon selection — only the artwork shown for an already-determined
  code/temperature/day-or-night combination changes.

### Key Entities

- **Weather Type**: One of 12 consolidated, recognizable weather categories (e.g. clear, cloudy,
  fog, light rain, heavy rain, thunder, sleet, light snow, heavy snow) that together cover all 27
  existing weather codes — replaces those 27 codes as the icon-selection key, though the codes
  themselves are unchanged everywhere else in the app (text descriptions, classification, etc.).
- **Temperature Band**: One of 6 ranges (below -20°C, -20 to -5°C, -5 to 5°C, 5 to 15°C, 15 to
  25°C, above 25°C) used to select how the character is dressed.
- **Character**: One of five distinct personas, each tied to one family of weather types (dry,
  rain, thunder, sleet, snow) — the same character always represents the same kind of weather
  everywhere it appears in the app.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every one of the 27 existing weather codes, at every temperature band and in both
  day and night, resolves to a defined piece of artwork — no combination ever results in a missing
  or broken icon.
- **SC-002**: The same weather type and temperature band always renders identically wherever it
  appears in the app (Today card, timeline, forecast strip, etc.) — 100% visual consistency across
  placements.
- **SC-003**: Replacing the icon artwork introduces no additional page-load network requests —
  icons continue to load as part of the app's existing bundled assets, exactly as today.

## Assumptions

- Scope is limited to the app's main weather-icon artwork (used in the Today card, timeline,
  forecast strips, details table, etc.). The separate small "cartoon companion" character shown
  beside the Today card's icon (061-cartoon-weather-companion, a distinct, already-shipped
  feature with its own 5-temperature-band system) is out of scope for this change — the two
  features are not required to share the same temperature-band boundaries or update together.
- The 12 consolidated weather types intentionally group some previously visually-distinct weather
  codes together (e.g. "light rain showers" and "light rain" now share one icon) — an intentional
  simplification from the source design provided for this feature, not a defect.
- Temperature band boundaries are: below -20°C (frozen), -20 to -5°C (cold), -5 to 5°C (near
  zero), 5 to 15°C (mild), 15 to 25°C (warm), above 25°C (hot). A boundary value belongs to the
  warmer of its two adjacent bands, consistent with this app's existing convention for other
  temperature-band logic.
- The source artwork needed to cover all 124 valid weather-type/temperature-band/day-or-night
  combinations already exists and is considered complete for this feature's scope — no further
  image generation is anticipated before implementation.
