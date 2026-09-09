# Data Model: Humidity Level Indicator

No new persisted entities. `WeatherObservation.relativeHumidity` (already exists, `number | null | undefined`) is now also populated by SMHI, for both forecast and observed periods, matching MET Norway/Open-Meteo.

## New pure function

```ts
// alongside TodaySummaryCard.tsx
function humidityLevel(percent: number): "Dry" | "Normal" | "High"
```

`< 30` → `"Dry"`; `30-70` inclusive → `"Normal"`; `> 70` → `"High"`.

## TodaySummaryCard (extended)

New optional prop `currentHumidity?: number | null`. Renders `Humidity {level}` in the existing Sunrise/Sunset/Moon detail row when non-null; nothing when null/undefined (FR-004).
