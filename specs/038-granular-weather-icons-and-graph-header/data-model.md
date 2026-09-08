# Data Model: More Granular Weather Icons and a Slimmer Graph Header

No new persisted entities or storage changes. Two existing types change shape/values:

## WeatherCondition (extended)

`src/services/weatherCondition.ts`

| Before | After |
|---|---|
| `"clear-day" \| "clear-night" \| "cloudy" \| "light-rain" \| "heavy-rain" \| "windy" \| "light-snow" \| "heavy-snow" \| "thunderstorm" \| "foggy" \| "sleet"` | Adds `"partly-cloudy"` |

`"cloudy"` narrows in meaning from "any cloud cover ≥ 50%" to "heavily overcast" (≥ 80%, or a source's own heavier symbol code); `"partly-cloudy"` covers what used to be the lower half of that range (50-79%, or a source's own lighter symbol code).

## WeatherConditionInput (extended)

`src/services/weatherCondition.ts`

| Field | Type | Description |
|---|---|---|
| `chanceOfRain` | `number \| null` (optional, new) | Percent (0-100) chance of precipitation for this period, when available. `undefined`/absent preserves today's amount-only behavior (FR-003); present-and-low suppresses an amount-based rain/snow classification (FR-001). |

No changes to `WeatherObservation`, `DailyAggregate`, or any other existing model — `chanceOfRain`/`chanceOfRainMax` already exist there and are simply threaded through to this one additional call parameter at each relevant call site.

## New constants

`src/services/weatherCondition.ts`

| Constant | Value | Purpose |
|---|---|---|
| `LOW_CONFIDENCE_CHANCE_OF_RAIN_PERCENT` | 20 | Below this, an amount-based (non-symbol-code) rain/snow classification is skipped |
| `OVERCAST_THRESHOLD_PERCENT` | 80 | At/above this cloud-cover percent (with no symbol code), classifies as `"cloudy"` (heavy) rather than `"partly-cloudy"` |

`CLOUDY_THRESHOLD_PERCENT` (existing, 50) keeps its role as the clear/any-cloud boundary.
