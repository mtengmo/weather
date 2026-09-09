# Feature Specification: Show Only the Place Name After Selecting a Location

**Feature Branch**: `049-show-only-place`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "also, the location name, remove the region and country in the name, it's enough to have it during searching, not after you have choosen a location."

Context: A location's `displayName` is built once, when it's found (search result, current position, or a saved favorite), as `"<place>, <region>, <country>"` (e.g. "Uppsala, Uppsala County, Sweden"), and that same full string is reused everywhere the location's name appears — the header, the favorites list, the location switcher, map pins, and every chart/table label. The region and country are genuinely useful while narrowing down a search result among same-named places, but once a location is chosen, repeating them everywhere is just noise — the viewer already knows which place they picked.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See just the place name once a location is chosen (Priority: P1)

A viewer who has selected a location (via search, current position, or a favorite) sees just its place name — e.g. "Uppsala" — everywhere that location's name is shown across the app, instead of the full "place, region, country" string.

**Why this priority**: This is the entire request — reduce redundant, already-known information cluttering the header and every other label once a location is settled on.

**Independent Test**: Select a location via search, then check the header, the favorites list, the location switcher, any map pin for that location, and chart/table labels — all show just the place name.

**Acceptance Scenarios**:

1. **Given** a location found via search (e.g. "Uppsala, Uppsala County, Sweden"), **When** the viewer selects it, **Then** the header shows just "Uppsala".
2. **Given** that same selected location, **When** the viewer opens the favorites list, the location switcher, the map, or any chart/table view, **Then** each shows just "Uppsala" too, not the full search-result string.
3. **Given** the current-position location, **When** its name is resolved, **Then** it's shown the same way — just the place name, everywhere it appears after being resolved.

---

### User Story 2 - Search results still show enough to tell places apart (Priority: P1)

A viewer typing a search query that matches multiple same-named places (e.g. more than one "Springfield") still sees the region/country alongside each result, so they can tell which one to pick.

**Why this priority**: Equally essential — the region/country isn't being removed everywhere, only after a location is chosen. Removing it from search results too would make disambiguation impossible.

**Independent Test**: Search for a place name known to exist in multiple regions/countries; confirm each result still shows its full "place, region, country" label.

**Acceptance Scenarios**:

1. **Given** a search query matching multiple same-named places, **When** the results list appears, **Then** each result still shows its region and country alongside the place name, unchanged from today.

---

### Edge Cases

- What happens for a place whose full name has no region or country to begin with (already just a bare name)? No visible change — nothing to shorten.
- What happens to an already-saved favorite whose name was stored with the full "place, region, country" string before this feature? It's shown shortened the same way as any other location, without needing to be re-added.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every place shown to the viewer as a *selected* location (header, favorites list, location switcher, map pins, chart/table labels, and any other display of the current location's name) MUST show only the place name, not its region or country.
- **FR-002**: Search results MUST continue to show the full "place, region, country" label, unchanged from today, so same-named places remain distinguishable while searching.
- **FR-003**: This change MUST apply to previously-saved favorites and cached locations as well as newly-selected ones, without requiring the viewer to re-add or re-select anything.
- **FR-004**: A place with no region or country in its full name MUST display unchanged (no error, no stray punctuation).

### Key Entities

- **Location name**: Now understood as having two forms — a full, disambiguating form (place + region + country) used only in search results, and a short form (place name only) used everywhere a location is shown after being selected.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of post-selection location-name displays across the app show only the place name.
- **SC-002**: 100% of search results continue to show the full disambiguating name, unchanged.
- **SC-003**: 0 regressions for previously-saved favorites — all display correctly shortened without user action.

## Assumptions

- "After you have chosen a location" covers every place the app shows that location's name once selected — the header, favorites list, location switcher, map pins, and chart/table labels — not just the header, since they're all the same "this is my chosen place" use case and none of them need disambiguation the way a search-results list does.
- The place name is simply the first, most-specific part of the existing "place, region, country" string (e.g. "Uppsala" out of "Uppsala, Uppsala County, Sweden") — no new geocoding lookup is needed.
