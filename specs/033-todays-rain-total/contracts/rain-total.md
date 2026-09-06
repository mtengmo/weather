# Contract: `sumCalendarDayPrecipitation` and the Today card's rain figure

## `sumCalendarDayPrecipitation(observations, reference): number | null`

**Contract**: Returns the sum of every `observations[i].precipitation` whose `timestamp` falls in
`[localMidnightStart(reference), localMidnightStart(reference) + 24h)`, ignoring `null` readings.
Returns `null` (not `0`) when no non-null reading falls in that span. Pure function, no I/O, no
mutation of `observations`.

**Preconditions**: `observations` may be in any order and may include timestamps outside today's
span (they're simply excluded) — the caller does not need to pre-filter.

## `TodaySummaryCard`'s rain figure

**Contract**: Renders using the new `todaysRainTotalMm` prop instead of `today.totalPrecipitation`
— when `todaysRainTotalMm` is `null`, the figure renders the card's existing "—" gap treatment
(unchanged from today's behavior for a missing value). Every other rendered value on the card
(icon/description, high/low, wind, sunrise/sunset) continues to read from `today` exactly as
before — this contract touches only the rain figure.
