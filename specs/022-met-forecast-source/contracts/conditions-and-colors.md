# Contract: Fixed 7-Day Icon Colors & Expanded Conditions (US2, US3)

## `src/components/WeeklyForecastStrip.tsx` (US2)

See `data-model.md` for the wrapping `weather-condition-${condition}` class addition. `ConditionRow`
in `WeatherIconOverview.tsx` (main timeline) is unchanged — it already applies this class
correctly; only the 7-day strip gains it.

## `src/services/weatherCondition.ts` (US3)

See `data-model.md` for `WeatherCondition`'s three new values and `deriveWeatherCondition`'s
updated precedence (symbol-code result → windy threshold override → symbol-code
cloudy/clear → existing full threshold fallback).

**Test-relevant**: a period with `symbolCondition: "thunderstorm"` and a very high `windSpeed`
must still classify as `"thunderstorm"`, since thunderstorm/fog/sleet symbol results are checked
*before* the windy override (only `cloudy`/`clear-*` symbol results defer to windy). A period with
`symbolCondition: undefined` and no other signal beyond the existing threshold inputs must classify
exactly as it did before this feature (no regression to the existing six-condition behavior when no
symbol code is available).

## `src/services/smhiProvider.ts` / `src/services/metNoProvider.ts` (US3)

See `data-model.md` for `SMHI_SYMBOL_CONDITIONS` (numeric 1-27 table) and `classifyMetNoSymbol`
(substring matching). `openMeteoProvider.ts` is unchanged — Open-Meteo has no symbol-code concept,
so its observations simply never set `symbolCondition`, and periods relying solely on Open-Meteo
data continue to use the existing threshold-based classification.

## `src/components/weatherIcons.tsx`, `src/index.css` (US3)

See `data-model.md` for the three new `WEATHER_ICONS` entries (`CloudLightning`, `CloudFog`,
`CloudDrizzle`) and the three new `--wx-*` theme variables plus `.weather-condition-*` color rules.

## No changes to

- The existing six conditions' own icons, colors, or classification thresholds — this is a pure
  addition of three new conditions plus a symbol-code-based precedence check ahead of them; no
  existing period that classified as e.g. `rainy` under the old logic changes classification
  unless its source's symbol code specifically indicates thunderstorm/fog/sleet.
- `ObservationDetails.tsx`'s existing Condition column rendering logic — it already calls
  `deriveWeatherCondition`/`WEATHER_ICONS` generically, so the expanded set applies there
  automatically with no code change (only the underlying data/enum grew).
