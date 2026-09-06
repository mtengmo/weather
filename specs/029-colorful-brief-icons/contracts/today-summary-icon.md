# Contract: `TodaySummaryCard`'s icon wrapper

**Contract**: When `condition !== null` (the same `condition` already used to pick `iconInfo` and
the description text), the element wrapping the icon carries an additional
`weather-condition-{condition}` class, exactly matching the class name convention already used
by `WeatherIconOverview.tsx`'s `ConditionRow` and `WeeklyForecastStrip.tsx` for the same
condition value. When `condition === null`, the wrapper's class list is unchanged from today (no
icon renders in that case either way).

**Non-goals**: No new CSS rule is added by this feature — the contract is fully satisfied by the
class name matching what `src/index.css`'s existing `.weather-condition-* svg` rules already key
off of.
