# Contract: `src/services/feelsLike.ts` (new, internal)

## Export

`deriveFeelsLike(input: { temperature: number | null; windSpeed: number | null; relativeHumidity: number | null }): number | null`

- Pure, synchronous. Returns `null` when `temperature` is `null` (nothing to adjust — mirrors 007's `deriveWeatherCondition` null convention).
- **One formula regardless of provider** (research.md §3): wind chill below the standard cold threshold (~10°C) when wind speed data is available, a simplified heat index above the standard warm/humid threshold (~27°C) when humidity data is available, otherwise returns the plain temperature unchanged. Exact threshold constants and formula coefficients are an implementation detail for `/speckit-tasks`, following the same widely-used formulas both the US National Weather Service's wind chill index and heat index use (public, non-proprietary equations) — not a bespoke invention.
- Operates on raw metric-unit values, same convention as `deriveWeatherCondition` (007) — the caller converts for *display*, this function does not.

## Caller

`WeatherIconOverview.tsx`, once per displayed period (hourly or daily), the same way `deriveWeatherCondition` is already called per period.
