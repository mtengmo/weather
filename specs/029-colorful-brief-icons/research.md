# Research: Colorful Daily Brief Icon

## §1 — Root cause

**Decision**: Confirmed by direct code inspection — `src/index.css` already defines a
`.weather-condition-{condition} svg { color: var(--wx-*) }` rule per recognized condition
(`010-timeline-visual-styling`, lines ~549–585), and every *other* place `WEATHER_ICONS[...]` is
rendered already wraps the icon in an element carrying that class
(`WeatherIconOverview.tsx`'s `ConditionRow`, `WeeklyForecastStrip.tsx`). `TodaySummaryCard.tsx`'s
own icon wrapper (`<div className="today-summary-icon">`, line 40) is the one place that never
gained this class, so its icon falls back to inheriting the surrounding text color instead of
its condition's own color.

**Fix**: Append the same `weather-condition-{condition}` class (only when `condition !== null`,
matching `WeatherIconOverview.tsx`'s own existing pattern for the same class) to
`.today-summary-icon`'s `className`.

**Rationale**: The color styling, the CSS variables per theme, and the exact class-naming
convention all already exist and are already exercised (and tested) elsewhere in the app — this
is a one-line reuse, not new styling.

**Alternatives considered**:
- Defining a separate, Today-card-specific color rule — rejected: would duplicate the existing
per-condition/per-theme palette for no reason, and risks the two falling out of sync if a theme
or condition is added later.
