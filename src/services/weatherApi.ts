import type {
  Location,
  NearbyStationCount,
  NearbyStationSeries,
  ObservationSeries,
  ObservationWindow,
  StationInfo,
  WeatherObservation,
  WeatherWarning,
} from "../models/types";
import * as metNoProvider from "./metNoProvider";
import * as openMeteoProvider from "./openMeteoProvider";
import * as smhiProvider from "./smhiProvider";
import { pointInPolygon } from "./geo";

async function isSmhiCovered(location: Pick<Location, "latitude" | "longitude">): Promise<boolean> {
  try {
    return await smhiProvider.isCovered(location);
  } catch {
    return false;
  }
}

// Windows that expect a forecast at all (006-forecast-now-marker); mirrors both providers'
// own FORECAST_HOURS gating (last-30-days is out of scope for forecast).
function expectsForecast(window: ObservationWindow): boolean {
  return window !== "last-30-days";
}

export async function getObservations(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<ObservationSeries> {
  if (await isSmhiCovered(location)) {
    try {
      const smhiResult = await smhiProvider.getObservations(location, window);

      // SMHI's observed data loaded fine, but its forecast (a single grid-point request
      // covering all metrics) came back empty for a window that expects one — try
      // Open-Meteo's forecast-only fetch rather than leaving the user with no forecast at
      // all. The SMHI-sourced observed points and station identity are left untouched
      // (spec Clarifications: "keep observed, swap forecast only").
      if (expectsForecast(window) && !smhiResult.observations.some((o) => o.isForecast)) {
        const fallbackForecast = await openMeteoProvider.getForecastOnly(location, window);
        if (fallbackForecast.length > 0) {
          return {
            ...smhiResult,
            observations: [...smhiResult.observations, ...fallbackForecast],
            forecastFromFallbackSource: true,
            primarySource: "smhi",
          };
        }
      }

      return { ...smhiResult, primarySource: "smhi" };
    } catch {
      // SMHI failed for an in-coverage location — silently fall back to Open-Meteo
      // rather than surfacing an error (the user asked for SMHI *with* a fallback).
    }
  }

  return { ...(await openMeteoProvider.getObservations(location, window)), primarySource: "open-meteo" };
}

/**
 * The set of risky (UV Index >= 6) hour-bucket keys for `location`/`window`, or an empty `Set`
 * for a non-Swedish location — STRÅNG is SMHI-only, so this reuses the same coverage gate every
 * other SMHI-only extra already uses (027-uv-index-alert, research.md §5).
 */
export async function getUvRisk(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<Set<number>> {
  if (!(await isSmhiCovered(location))) {
    return new Set();
  }
  return smhiProvider.getUvIndex(location, window);
}

// SMHI's own published warning-level scale, from an informational message up through its
// highest-impact class (028-severe-weather-warnings, research.md §4) — an unrecognized/future
// code sorts below every recognized one (defensive default, never crashes or wrongly promotes).
const SEVERITY_ORDER: Record<string, number> = {
  MESSAGE: 0,
  CLASS_1: 1,
  CLASS_2: 2,
  CLASS_3: 3,
};

function severityRank(code: string): number {
  return SEVERITY_ORDER[code] ?? -1;
}

/** How far ahead a published-but-not-yet-started warning is still surfaced as "upcoming" before
 *  being hidden until it enters this window (045-show-upcoming-smhi, research.md §1). */
const UPCOMING_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * The location's currently-active and near-term upcoming warnings, active-first then
 * most-to-least severe within each group — empty for a location outside SMHI coverage, a fetch
 * failure, or genuinely no active/upcoming warning (all three are indistinguishable by design,
 * 028-severe-weather-warnings, data-model.md; window widened in 045-show-upcoming-smhi).
 */
export async function getWarningsForLocation(
  location: Pick<Location, "latitude" | "longitude">
): Promise<WeatherWarning[]> {
  if (!(await isSmhiCovered(location))) {
    return [];
  }

  const raw = await smhiProvider.getActiveWarnings();
  const now = Date.now();
  const warnings: WeatherWarning[] = [];

  for (const warning of raw) {
    for (const area of warning.warningAreas) {
      const validFrom = Date.parse(area.approximateStart);
      const validUntil = area.approximateEnd ? Date.parse(area.approximateEnd) : null;
      if (validFrom > now + UPCOMING_WINDOW_MS) continue;
      if (validUntil !== null && validUntil <= now) continue;
      if (!pointInPolygon(location, area.area.geometry)) continue;

      warnings.push({
        id: `${warning.id}-${area.id}`,
        severityCode: area.warningLevel.code ?? "",
        severityLabel: area.warningLevel.en ?? area.warningLevel.sv ?? "",
        title: warning.event.en ?? warning.event.sv ?? "",
        areaName: area.areaName?.en ?? area.areaName?.sv ?? "",
        description: area.descriptions
          .map((d) => `${d.title.en ?? d.title.sv ?? ""}: ${d.text.en ?? d.text.sv ?? ""}`)
          .join("\n\n"),
        validFrom: area.approximateStart,
        validUntil: area.approximateEnd ?? null,
        isActive: validFrom <= now,
      });
    }
  }

  return warnings.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return severityRank(b.severityCode) - severityRank(a.severityCode);
  });
}

export async function getNearbyStationSeries(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow,
  count: NearbyStationCount
): Promise<NearbyStationSeries[]> {
  if (count === 0) {
    return [];
  }

  if (!(await isSmhiCovered(location))) {
    return [];
  }

  let stations: StationInfo[];
  try {
    // Fetch one extra: the nearest station is presumed to be the one already used
    // for the location's own series, so it's excluded from the comparison set.
    stations = await smhiProvider.getNearestStations(location, count + 1);
  } catch {
    return [];
  }

  const comparisonStations = stations.slice(1, count + 1);

  const results = await Promise.allSettled(
    comparisonStations.map(async (station): Promise<NearbyStationSeries> => {
      const series = await smhiProvider.getObservations(station, window);
      return { station, series };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<NearbyStationSeries> => r.status === "fulfilled")
    .map((r) => r.value);
}

export interface MultiSourceForecastEntry {
  source: "smhi" | "open-meteo" | "met-no";
  observations: WeatherObservation[];
  /** Same meaning as `ObservationSeries.forecastIssuedAt` — SMHI's/MET Norway's own genuine
   *  "forecast generated at" time when available, always `null`/absent for Open-Meteo
   *  (019-dashboard-polish-round-four, research.md §8; MET Norway added 022-met-forecast-source).
   *  Optional so existing test fixtures/mocks that predate this field keep compiling, matching
   *  this codebase's existing convention for `ObservationSeries.primarySource`. */
  issuedAt?: string | null;
}

/**
 * Every source's own forecast-only observations for a location, fetched independently so one
 * source's failure never blocks the others (014-dashboard-usability-fixes, FR-013–FR-017; MET
 * Norway added as a third source, 022-met-forecast-source). Forecast-only, by design — combining
 * observed/historical data isn't in scope.
 */
export async function getMultiSourceForecast(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<MultiSourceForecastEntry[]> {
  const [smhiResult, openMeteoResult, metNoResult] = await Promise.allSettled([
    (async () => {
      if (!(await isSmhiCovered(location))) return { observations: [], issuedAt: null };
      // Forecast-only path (025-reduce-api-requests, US2) — avoids re-fetching all six
      // observation parameters (which the primary series's own getObservations call already
      // fetched) just to discard everything except the forecast portion.
      return smhiProvider.getForecastOnly(location, window);
    })(),
    openMeteoProvider.getForecastOnly(location, window),
    metNoProvider.getForecastOnly(location, window),
  ]);

  const entries: MultiSourceForecastEntry[] = [];
  if (smhiResult.status === "fulfilled" && smhiResult.value.observations.length > 0) {
    entries.push({ source: "smhi", observations: smhiResult.value.observations, issuedAt: smhiResult.value.issuedAt });
  }
  if (openMeteoResult.status === "fulfilled" && openMeteoResult.value.length > 0) {
    entries.push({ source: "open-meteo", observations: openMeteoResult.value, issuedAt: null });
  }
  if (metNoResult.status === "fulfilled" && metNoResult.value.observations.length > 0) {
    entries.push({ source: "met-no", observations: metNoResult.value.observations, issuedAt: metNoResult.value.issuedAt });
  }
  return entries;
}
