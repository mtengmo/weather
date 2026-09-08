# Phase 1 Data Model: Restore Rain Percentage and Remove Sticky Row-Title Column

No new or changed data entities. This feature is a display-behavior fix over existing data already flowing through the app.

## Existing entities touched (unchanged shape)

- **`TimelinePoint`** (`src/components/timelineData.ts`): already carries an optional `chanceOfRain?: number | null` field for the Rain row. No field changes — this feature only concerns whether/how it's rendered.
- **`TimelineRow`** (`src/components/timelineData.ts`): the Rain row's `points` array of `TimelinePoint`. No structural changes.

## Presentation-only concepts (not data entities)

- **Rain cell display**: `"<mm value>"` optionally followed by `" · <chanceOfRain>%"` when `chanceOfRain` is present and greater than 0. Purely a rendering rule in `BarRow` (`WeatherIconOverview.tsx`); no schema.
- **Row title pinning**: a CSS positioning property (`position: sticky`) on `.weather-timeline-row-title`, not a data concept — removing it changes layout behavior only.
