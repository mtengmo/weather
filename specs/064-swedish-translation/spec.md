# Feature Specification: Swedish Translation Based On Browser Language

**Feature Branch**: `064-swedish-translation`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "does the site have swedish translation? If not, specify it based on browser language"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Swedish-speaking user sees the app in Swedish automatically (Priority: P1)

A user whose browser/device language is set to Swedish opens the app. Every piece of text the app
shows — labels, buttons, section headings, weather descriptions, warning messages, the "How it
works" and privacy explanations — appears in Swedish, without the user having to find or use any
kind of language switch.

**Why this priority**: This is the entire ask — the app currently has no translation at all
(confirmed: every user-facing string is hardcoded English), so this is the whole feature.

**Independent Test**: Set a browser's language preference to Swedish, load the app, and confirm
every visible piece of text is in Swedish rather than English.

**Acceptance Scenarios**:

1. **Given** a browser set to Swedish, **When** the app loads, **Then** all labels, headings,
   buttons, and messages appear in Swedish.
2. **Given** a browser set to a regional Swedish variant (e.g. Finland-Swedish), **When** the app
   loads, **Then** it's still treated as Swedish and the app appears in Swedish.
3. **Given** the app is already open in Swedish, **When** the user navigates between its existing
   views (Overview, Details, Map, etc.), **Then** every view continues to show Swedish text — the
   translation isn't limited to just the first screen shown.

---

### User Story 2 - Non-Swedish users see no change (Priority: P1)

A user whose browser language is anything other than Swedish opens the app and sees it exactly as
it looks today — in English.

**Why this priority**: Equally essential as User Story 1 — this feature must not change the
experience for the app's existing (English-speaking) users, so it's the other half of the same
launch.

**Independent Test**: Set a browser's language preference to something other than Swedish (e.g.
English, French, or an unset/default value), load the app, and confirm it looks identical to
today's English-only experience.

**Acceptance Scenarios**:

1. **Given** a browser set to English, **When** the app loads, **Then** it appears exactly as it
   does today, in English.
2. **Given** a browser set to a language that is neither English nor Swedish, **When** the app
   loads, **Then** it falls back to English (today's existing behavior), not a broken mix of
   languages.

---

### Edge Cases

- What happens to the app's number/date formatting (temperatures, times, the "Updated HH:MM"
  footer, etc.)? Unaffected by this feature — only text labels and written copy are translated;
  existing formatting conventions (including the app's own intentional choice to always show a
  24-hour clock format regardless of locale, so times read consistently across devices) stay
  exactly as they are today.
- What happens if the browser reports a language the app doesn't recognize at all? Falls back to
  English, the same as any other non-Swedish language (no broken or partially-translated state).
- What happens to text that combines a translated label with a live data value (e.g. "High 15°",
  a place name, a data-source attribution)? The surrounding label translates; the data value
  itself (numbers, place names as returned by the map/geocoding service) is not altered.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST detect the user's browser/device language preference when the app
  loads.
- **FR-002**: When the detected language is Swedish (in any of its regional variants), the system
  MUST display all of the app's user-facing text in Swedish.
- **FR-003**: When the detected language is not Swedish, the system MUST display the app in
  English, matching its current behavior exactly — this feature must not change what non-Swedish
  users see.
- **FR-004**: Swedish coverage MUST include every user-facing piece of text the app currently
  shows in English — short labels and buttons, section headings, weather condition/warning
  descriptions, and longer explanatory content (e.g. "How it works", the privacy notice) — not
  just a partial subset.
- **FR-005**: Language detection MUST be automatic, based on the browser's reported language —
  this feature does not require adding a manual, in-app language switcher (see Assumptions).
- **FR-006**: Existing number, date, and time formatting conventions MUST remain unchanged by this
  feature — translation applies to text labels and copy only, never to how values are formatted.

### Key Entities

- **Locale**: The two supported display languages for this feature — English (the existing
  default) and Swedish (new). Determined once per app load from the browser's reported language
  preference.
- **Translated Text**: Every user-facing string the app displays, now available in both English
  and Swedish rather than hardcoded to English only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with a Swedish browser language sees 100% of the app's existing user-facing
  text in Swedish — no screen, view, or message is left showing English.
- **SC-002**: A user with a non-Swedish browser language sees no observable difference from the
  app's behavior today.
- **SC-003**: Changing the browser's language preference (Swedish, or back to something else) and
  reloading the app is sufficient on its own to switch the displayed language — no separate
  in-app action is needed.

## Assumptions

- A manual, in-app language switcher (to override the browser-detected language) is out of scope
  for this feature — the request was specifically for automatic detection based on browser
  language. It's a reasonable future enhancement but isn't required here.
- "Swedish" covers all regional Swedish locale variants a browser might report (e.g. `sv`, `sv-SE`,
  `sv-FI`) — the app doesn't need to distinguish between them for translation purposes.
- Any language other than Swedish continues to fall back to English, the app's existing sole
  language today — this feature adds Swedish as a second option, it doesn't change the fallback
  behavior for any other language.
- Live data values themselves (place names from search/geocoding, numeric readings, data-source
  names like "Open-Meteo"/"SMHI") are not translated — only the app's own surrounding text/labels
  are.
- This is a substantial, cross-cutting change: confirmed the app currently has zero translation
  infrastructure — every user-facing string across roughly 25 component files is hardcoded English
  text. This feature necessarily touches most of those files to make each string
  language-aware, not a small isolated change.
