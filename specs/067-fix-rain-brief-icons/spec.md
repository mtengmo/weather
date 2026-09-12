# Feature Specification: Stop Brief Morning Rain From Marking the Whole Day, and Refresh Weather Icon Artwork

**Feature Branch**: `067-fix-rain-brief-icons`

**Created**: 2026-09-12

**Status**: Draft

**Input**: User description: "still it looks like a rain forecast for tomorrow on the daily brief, even if it's just raining in the morning in Uppsala. Also, I have added new weather icons png files, replaced all files, could you split and update them again. Same naming standards."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A brief morning shower no longer marks the whole day as rainy (Priority: P1)

A user in Uppsala checks tomorrow's forecast in the weekly forecast strip. Rain is only expected for a couple of hours in the morning, with the rest of the day dry, but the strip still shows a rain icon and condition for all of tomorrow. This is a regression the user already reported once (066-daily-forecast-language-setting fixed the case where rain was purely overnight, but a short *daytime* shower still dominates the whole day's displayed condition).

**Why this priority**: Same visible, everyday accuracy problem as before — the daily forecast strip is checked on every visit, and a misleading rain icon for an otherwise-dry day undermines trust in the app right after the previous fix was supposed to resolve exactly this class of complaint.

**Independent Test**: Can be fully tested by constructing a day where rain is confined to a couple of morning hours (e.g. 7-9 AM) with the rest of the daytime hours (through 8 PM) dry, and confirming the weekly strip now shows a dry condition/icon for that day instead of rain; and by constructing a day where rain spans most of the daytime hours, confirming it still correctly shows rain.

**Acceptance Scenarios**:

1. **Given** a forecast day where measurable rain occurs during only a couple of morning hours and the rest of the daytime hours (6 AM-8 PM) are dry, **When** the weekly forecast strip renders that day, **Then** it shows a dry condition (not rain) and its icon reflects that.
2. **Given** a forecast day where measurable rain occurs across most of the daytime hours, **When** the weekly forecast strip renders that day, **Then** it still shows rain.
3. **Given** a forecast day with a genuinely heavy, intense rain event confined to a couple of morning hours (not just a light drizzle), **When** the weekly forecast strip renders that day, **Then** the display still reasonably reflects that a significant rain event is expected that day, rather than hiding a real heavy-rain warning just because it was brief.
4. **Given** a forecast day with no precipitation at any hour, **When** the weekly forecast strip renders that day, **Then** its condition and icon are unaffected by this change (same as today).
5. **Given** a forecast day already correctly shown as dry or rainy under the previous (066) overnight-only fix, **When** re-evaluated under this fix, **Then** the outcome is unchanged — this fix only affects days where rain is confined to part of the daytime span, not the overnight-vs-daytime distinction already handled.

---

### User Story 2 - Refresh the weather icon artwork from newly supplied source images (Priority: P2)

The user has replaced the source sprite-sheet images used to generate the app's weather icon artwork with new versions of the same files. They want the app's icons regenerated from these new source images, using the same file-splitting process and naming convention as before, so the app displays the updated artwork without any other change in behavior.

**Why this priority**: A visual asset refresh, independent of the rain-classification bug above — valuable on its own but not fixing a functional defect, so it's secondary to User Story 1.

**Independent Test**: Can be fully tested by running the icon-splitting process against the newly supplied source images and confirming the app's weather icons directory contains the same complete set of files (same names, same count) as before, now showing the updated artwork, with no code changes needed elsewhere in the app.

**Acceptance Scenarios**:

1. **Given** the user has replaced the source sprite-sheet image files with new versions, **When** the icon-splitting process is run, **Then** the app's weather icon artwork directory ends up with the exact same set of individual icon files (same names, same coverage of weather type/day-night/temperature band) as before, now containing the new artwork.
2. **Given** the regenerated icons are in place, **When** the app is used normally, **Then** every place that previously showed a weather icon still shows one — nothing regresses to a missing image or a fallback icon because a file is missing or misnamed.
3. **Given** the regenerated icons are in place, **When** the app's existing icon-selection logic runs, **Then** it requires no changes — only the image content changes, not any file names, paths, or the mapping logic that selects among them.

---

### Edge Cases

- A day with rain intensity high enough to matter even briefly (e.g. a short but heavy downpour) must not be silently hidden just because it doesn't last long — Acceptance Scenario 3 above requires the fix to distinguish "a little rain that doesn't matter" from "a real, if brief, rain event," rather than simply requiring rain to last a long time regardless of intensity.
- A day with rain spread thinly and lightly across the whole daytime span (never intense, always present) must still show as rain — this fix targets *brief* rain, not *light* rain.
- If the newly supplied source icon images don't cover every weather type/day-night/temperature-band combination the app currently expects, the regeneration must not silently leave stale (old-artwork) files in place for the missing combinations without it being noticed — treat a mismatch in output file count/coverage as something to flag, not silently ignore.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The weekly forecast strip's daily condition/icon MUST NOT show rain for a day when measurable rain occurs during only a small part of that day's daytime hours (6 AM-8 PM) while the rest of the daytime hours are dry — for example, a shower confined to a couple of morning hours.
- **FR-002**: The weekly forecast strip's daily condition/icon MUST still show rain for a day when rain occurs across most of that day's daytime hours, unchanged from today's behavior for such days.
- **FR-003**: The weekly forecast strip's daily condition/icon MUST still show rain for a day with a brief but sufficiently intense/heavy rain event, even though it's confined to only part of the daytime hours — brief-and-light is treated differently from brief-and-heavy.
- **FR-004**: This fix MUST build on, not replace, the existing daytime-vs-overnight distinction (066-daily-forecast-language-setting) — a day whose only rain is entirely overnight (before 6 AM or after 8 PM) continues to show as dry, exactly as already fixed.
- **FR-005**: This fix MUST apply only to the weekly forecast strip's whole-day condition derivation; it MUST NOT change any other view's rain display (the hourly timeline, the 3-day/7-day sub-day-period overview, or the Today card), which already show rain at the specific hour/period it actually occurs.
- **FR-006**: The app's weather icon artwork files MUST be regenerated from the newly supplied source sprite-sheet images, using the same splitting process and file-naming convention already established (063-replace-weather-icons).
- **FR-007**: The regenerated icon artwork MUST cover the exact same set of weather-type/day-night/temperature-band combinations as the current artwork — no combination the app can currently display should end up missing a file after regeneration.
- **FR-008**: The regenerated icon artwork MUST NOT require any change to the app's icon-selection code — only the image files' visual content changes, at the same file paths and names.

### Key Entities

- **Daily forecast condition (weekly strip)**: The single weather condition/icon shown per day in the weekly forecast strip — already refined once (066) to prefer daytime hours over the whole rolling 24-hour window; refined further here to require rain to be a meaningful part of the daytime span, not just present at some point in it.
- **Weather icon artwork set**: The complete collection of individual icon image files (one per weather-type × day/night × temperature-band combination) that the app's icon-selection logic looks up by a fixed naming convention; refreshed here from newly supplied source images without changing the convention itself.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A day with rain confined to a couple of morning hours (out of the full 6 AM-8 PM daytime span) and dry the rest of the day is shown as dry in the weekly forecast strip 100% of the time, matching the Uppsala scenario reported.
- **SC-002**: A day with rain spanning most of the daytime hours is still shown as rain in the weekly forecast strip 100% of the time, matching today's behavior exactly.
- **SC-003**: A day with a brief but heavy rain event is still shown as rain in the weekly forecast strip, so a genuinely significant rain event is never hidden.
- **SC-004**: After the icon artwork is regenerated, every weather icon the app displays anywhere in the product renders the new artwork with zero missing-image or fallback-icon occurrences.

## Assumptions

- "A small part of the daytime hours" / "most of the daytime hours" are treated as a majority-vs-minority distinction (rain present across more than half of the day's daytime hours counts as "most"; a couple of hours out of a full 6 AM-8 PM span counts as "a small part") — the precise technique for measuring this (e.g. counting hours with measurable rain, or otherwise) is left to the planning phase, but must satisfy Acceptance Scenarios 1-3 and Success Criteria 1-3 exactly.
- "Sufficiently intense/heavy" reuses the app's own existing heavy-vs-light rain intensity distinction (already used elsewhere in the app for hourly rain classification) rather than introducing a new threshold concept.
- The new source sprite-sheet images the user added replace the previous source images in place, under the same filenames and same expected format/layout the existing splitting process already reads — no new source-file naming or location convention is introduced.
- The regenerated icon artwork is a pure visual asset replacement — no new weather types, day/night variants, or temperature bands are being added or removed as part of this feature.
