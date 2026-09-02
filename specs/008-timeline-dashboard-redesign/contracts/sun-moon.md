# Contract: `src/services/sunMoon.ts` (new, internal, no network access)

## Exports

- `getSunTimes(location: { latitude, longitude }, date: Date): { sunrise: string | null; sunset: string | null }` — ISO 8601 timestamps, computed via the classic public-domain sunrise/sunset equations (research.md §4). Pure and synchronous. Either field is `null` when that date has no sunrise/sunset at the given latitude (polar day/night — a real case for this app's SMHI-covered northern-Sweden locations, discovered during implementation and handled explicitly rather than producing `NaN`/incorrect times).
- `getMoonPhase(date: Date): MoonPhase` — one of the 8 conventional phase names, computed via the synodic-month approximation (research.md §4). Pure, synchronous, and (unlike sun times) independent of location.

```ts
type MoonPhase =
  | "new" | "waxing-crescent" | "first-quarter" | "waxing-gibbous"
  | "full" | "waning-gibbous" | "last-quarter" | "waning-crescent";
```

**Contract**: No `fetch`, no `async`, no failure mode to degrade — both are self-contained calculations from inputs the caller already has (a selected `Location` and the current or displayed date), so unlike every provider module in this app, there is nothing here that can fail at runtime beyond a programming error.

**Caller**: `WeatherIconOverview.tsx` only, once per render (not once per row/period) — the Sun & Moon Summary (data-model.md) is shown once for the displayed period, not per hour/day.
