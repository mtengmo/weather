# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Swedish-speaking everyday users (the owner and people like them) who open the app on a phone, often in a glance, to decide what to wear and whether it will rain or blow. A smaller group digs into hourly, rain, wind and observation detail. Language is Swedish first, English second.

## Product Purpose

Tengmo Väder shows the weather for the user's current position and saved places, as one continuous picture of what has been observed and what is forecast. It exists to make the weather instantly human-readable and trustworthy, without ads or clutter. Success is that the user knows what to wear and what to expect within a second or two of opening it, and can drill into the numbers when they want to.

## Positioning

- Characters dressed for the actual temperature and conditions turn the forecast into something instantly readable.
- Observations and forecast sit on the same series: a single timeline with a "Now" marker, with past readings and the forecast side by side, in 24-hour, 3-day and 7-day views.

## Operating Context

- Delivered as a web app/PWA (vader.tengmo.com, hosted on GitHub Pages) and a native Android app with home-screen widgets. A native iOS app is planned but not started; it needs a Mac or a macOS build service.
- Forecast and observation data come from SMHI, MET Norway and Open-Meteo, combined across sources; SMHI also supplies station observations and warnings. Place names come from reverse geocoding.
- Interface languages are Swedish and English. Temperature, wind and rain units are user-selectable.
- Light and dark themes exist (internally "Ivory" and "Midnight").
- The Android app syncs in the background and can show saved data offline.

## Capabilities and Constraints

- Overview with a Today card, an hourly or 3-day/7-day timeline, a weekly strip and warnings; graph and details views; map; favorites and place search; settings (units, language, theme, high/low, nearby stations).
- 3-day columns are Morning 06–11, Lunch 11–13, Afternoon 13–17, Evening 17–21 and Night 21–06. The 7-day view uses calendar days with the "Now" marker inside today's column.
- Third-party sites are not embedded in the map view; this was rejected earlier. Map tiles and overlays are fine.
- Notifications (warnings, "rain soon") are not built yet and are undecided.
- Undecided: the Apple developer account type, whether the repo will be public or private, and whether the app is published under the owner's name.

## Brand Commitments

The name is "Tengmo Väder". The character icon sets (a person dressed for the weather, plus companion characters) are the product's identity and are used on the web and in the Android app. Weather icons are paired with the character, not replaced by generic glyphs.

## Evidence on Hand

- Character and weather icon art: `src/assets/weather-characters/` and `src/assets/weather-icons-v2/` (mirrored for Android under `android/app/src/main/res/drawable-nodpi`); sources and splitting notes under `docs/weathericons/` and `docs/logos/`.
- App icons: `public/icon-192.png`, `public/icon-512.png`, favicons.
- Real forecast and observation data at runtime; no testimonials, customers, ratings or usage numbers exist, and none should be invented.

## Product Principles

1. At a glance first, numbers on demand: the answer ("what do I wear, will it rain") comes before the data behind it.
2. Observed and forecast are one story: never separate past readings and forecast into different places when they can sit on the same series.
3. The character is the message: iconography carries the headline weather, always paired with the real numbers.
4. Honest about freshness and sources: show when the data was updated, work offline from saved data, and never present a forecast as an observation.
5. Native where it counts: each platform follows its own conventions for navigation, widgets, back behaviour and accessibility while the characters and tone stay constant.

## Accessibility & Inclusion

Android targets TalkBack with content descriptions on icon-only controls, correct selected-state announcements, and layouts that survive large system fonts, including Swedish labels at 200%. Swedish and English must stay in sync. No wider standard (such as WCAG level) has been formally required yet.
