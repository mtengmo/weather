import type { ObservationWindow } from "../models/types";

/** Forecast reach when the 24-hour Overview is toggled to "Show 48h". */
export const EXTENDED_FORECAST_HOURS = 48;

/** Forecast hours to request: the per-window default, or 48 when the extended hourly forecast
 *  is requested (only meaningful for the 24-hour window; other windows are unaffected). */
export function forecastHoursFor(
  base: Record<ObservationWindow, number>,
  window: ObservationWindow,
  extendedForecast: boolean
): number {
  return extendedForecast && window === "last-24-hours" ? EXTENDED_FORECAST_HOURS : base[window];
}
