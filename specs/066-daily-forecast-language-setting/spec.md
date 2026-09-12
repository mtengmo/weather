# Feature Specification: Daytime-Weighted Daily Forecast & Manual Language Setting

**Feature Branch**: `066-daily-forecast-language-setting`

**Created**: 2026-09-12

**Status**: Draft

**Input**: User description: "the daily forecast for tomorrow says rain, but thats only in the early morning. Shouldnt the daily one use daytime at least. Could you also add a language setting under setting so i could choose english or swedish"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Daily forecast reflects the day, not just its worst hour (Priority: P1)

A user checks tomorrow's weather in the weekly forecast strip. A brief early-morning shower is the only rain expected all day, but the strip currently shows a rain icon and condition for the entire day because a single overnight shower dominates that day's aggregated numbers. The user wants the daily summary to reflect what the day will actually feel like if they're awake and outside during it, not a rare overnight blip.

**Why this priority**: This is a visible, everyday accuracy bug — the daily forecast is one of the most-viewed elements in the app (it's shown in the header/strip on every visit), and a misleading rain icon can make a user cancel plans or bring an umbrella unnecessarily on an otherwise dry day.

**Independent Test**: Can be fully tested by constructing a day with a rain shower confined to the early-morning hours and clear/dry conditions the rest of the day, and confirming the weekly strip now shows a dry/clear condition and icon for that day instead of rain.

**Acceptance Scenarios**:

1. **Given** a forecast day with rain only between midnight and 6 AM and no precipitation the rest of the day, **When** the weekly forecast strip renders that day, **Then** it shows a dry condition (not rain) and its icon reflects that.
2. **Given** a forecast day with rain occurring at any point between 6 AM and 8 PM, **When** the weekly forecast strip renders that day, **Then** it still shows rain — daytime rain must never be hidden.
3. **Given** a forecast day with rain both overnight and during the day, **When** the weekly forecast strip renders that day, **Then** it shows rain (daytime rain always wins, regardless of any overnight rain also present).
4. **Given** a forecast day with no precipitation at any hour, **When** the weekly forecast strip renders that day, **Then** its condition and icon are unaffected by this change (same as today).

---

### User Story 2 - Manually choose English or Swedish (Priority: P2)

A user opens the Settings menu and wants to pick which language the app displays in, rather than relying on their browser's reported language. Someone whose browser is set to English but who wants to read the app in Swedish (or vice versa) currently has no way to do this.

**Why this priority**: Independent of the forecast bug — a smaller, standalone usability improvement that builds on the existing Swedish translation feature (064-swedish-translation) by giving users direct control instead of only automatic detection.

**Independent Test**: Can be fully tested by opening Settings, switching the language option to Swedish, confirming the entire app immediately re-renders in Swedish, then switching to English and confirming it reverts — independent of the user's actual browser language.

**Acceptance Scenarios**:

1. **Given** the Settings menu is open, **When** the user selects "Svenska", **Then** all app text immediately switches to Swedish, without a page reload.
2. **Given** the Settings menu is open, **When** the user selects "English", **Then** all app text immediately switches to English.
3. **Given** a user has previously chosen a language, **When** they reload the app or return in a new session, **Then** the app opens in their chosen language rather than re-detecting the browser's language.
4. **Given** a user has never chosen a language, **When** they open the app, **Then** it behaves exactly as it does today — auto-detected from the browser's reported language.

---

### Edge Cases

- A forecast day with rain exactly at the daytime boundary hours (6:00 or 20:00) is treated as daytime rain (inclusive of both boundary hours), consistent with the existing day/night boundary already used elsewhere in the app.
- A day with too little forecast data to determine any hourly breakdown falls back to today's existing whole-day aggregation behavior, so a day never ends up with no condition at all.
- If a user selects a manual language and their browser is later set to a third, unrelated language, the manual choice still takes precedence — manual selection always overrides browser detection until the user changes it again or explicitly reverts to automatic.
- Switching the language setting does not affect any non-text formatting the app already keeps locale-independent (numbers, dates, times, the 24-hour clock format) — only translated UI text changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The weekly forecast strip MUST derive each day's displayed condition and icon primarily from that day's daytime hours (6:00 AM–8:00 PM local time, matching the day/night boundary already used elsewhere in the app), rather than from all 24 hours equally.
- **FR-002**: If precipitation (or any other condition-driving signal) occurs during daytime hours, it MUST be reflected in that day's displayed condition, regardless of what else happens overnight.
- **FR-003**: If precipitation (or any other condition-driving signal) occurs only outside daytime hours, it MUST NOT by itself cause that day's displayed condition to show that signal.
- **FR-004**: This change MUST apply only to the whole-day condition/icon computation; it MUST NOT change any sub-day period view that already breaks a day into smaller time-of-day segments (those already isolate overnight hours correctly).
- **FR-005**: The Settings menu MUST offer a language choice with three options: automatic (the existing browser-detection behavior), English, and Swedish.
- **FR-006**: Selecting English or Swedish MUST immediately change all translated UI text across the app without requiring a reload.
- **FR-007**: The user's chosen language option MUST persist across sessions (reloads, new visits) the same way the app's other display preferences (theme, units) already persist.
- **FR-008**: When the language option is set to automatic (the default, including for users who have never changed it), the app MUST continue to auto-detect the language from the browser exactly as it does today.
- **FR-009**: The language setting MUST NOT change any non-text formatting (numbers, dates, times) that today is intentionally locale-independent.

### Key Entities

- **Language preference**: The user's chosen display-language mode for the app — one of "automatic", "English", or "Swedish" — stored locally in the browser and read on every app load, alongside the app's other saved display preferences (theme, units, nearby-station count, etc.).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A day with rain confined to before 6 AM or after 8 PM, and dry the rest of the day, is shown as dry in the weekly forecast strip 100% of the time.
- **SC-002**: A day with any rain between 6 AM and 8 PM is shown as rain in the weekly forecast strip 100% of the time, matching today's behavior exactly.
- **SC-003**: A user can switch the app's display language via Settings and see every visible piece of translated text change within one interaction (a single selection), with no page reload.
- **SC-004**: A user's manually chosen language is still in effect after closing and reopening the app, in 100% of cases.

## Assumptions

- "Daytime" is defined as 6:00 AM–8:00 PM local clock time, reusing the exact boundary the app's existing day/night icon logic (`isNight`) already applies elsewhere, rather than introducing a new sunrise/sunset-based definition.
- The weekly forecast strip is the only place affected by the daily-condition bug; the app's 3-day/7-day overview already breaks each day into smaller time-of-day segments and is unaffected (confirmed by inspecting current behavior).
- A third "automatic" language option is included alongside English/Swedish so existing users' auto-detected experience is preserved by default — only users who actively open Settings and choose a language are opted into a fixed one.
- The language setting reuses the app's existing local-storage-based preference pattern (already used for theme, units, and other toggles) rather than any account or server-side storage, consistent with the app having no backend.
