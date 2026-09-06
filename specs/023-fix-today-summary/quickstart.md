# Quickstart: Fix Today Summary's Backward-Looking Condition

## Prerequisites

```sh
npm ci
npm run dev
```

Select a real location whose recent past and upcoming weather genuinely differ (easiest to spot
in the evening/night, when the trailing 24h often includes a different daytime condition than
the day ahead).

## US1 — Today card matches the forward-looking hourly forecast

1. Open the Overview. **Expect**: the persistent Today card's condition/description matches the
   dominant condition shown across the visible 24-hour hourly timeline below it, not a different
   reading dominated by hours that have already passed.
2. Compare the Today card's High/Low against the 7-day strip's first ("today") card. **Expect**:
   they match (both now read the same forward-looking bucket).
3. For a location with no forecast data at all (or by simulating one), confirm the Today card
   still shows a summary based on the most recent observed data, rather than disappearing or
   showing nothing.

## Automated checks

```sh
npm test
npm run lint
npm run build
```
