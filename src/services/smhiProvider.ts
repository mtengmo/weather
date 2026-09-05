import type { ObservationSeries, ObservationWindow, StationInfo, WeatherObservation } from "../models/types";

const BASE_URL = "https://opendata-download-metobs.smhi.se/api/version/1.0";
const TEMPERATURE_PARAM = 1;
const PRECIPITATION_PARAM = 7;
const WIND_PARAM = 4;
const CLOUD_PARAM = 16; // "procent" per SMHI's own parameter metadata — already 0-100, no conversion needed
// Confirmed via SMHI's parameter catalog to share wind_param's exact cadence ("medelvärde 10
// min, 1 gång/tim") — not the higher-frequency parameter 48 of the same name
// (008-timeline-dashboard-redesign, contracts/provider-fields.md).
const WIND_DIRECTION_PARAM = 3;
const WIND_GUST_PARAM = 21; // "Byvind", max/hour, m/s
const COVERAGE_RADIUS_KM = 50;

// Point-forecast API (lat/lon grid point, no station id) — replaces the deprecated
// pmp3g/version/2 endpoint, which SMHI shut down 2026-03-31 (research.md §1).
const FORECAST_BASE_URL = "https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point";

const WINDOW_HOURS: Record<ObservationWindow, number> = {
  "last-24-hours": 24,
  "last-7-days": 24 * 7,
  "last-30-days": 24 * 30,
};

// How many hours of forecast to append after "now", per window (research.md §5 / spec Assumptions:
// last-30-days is out of scope for forecast).
const FORECAST_HOURS: Record<ObservationWindow, number> = {
  "last-24-hours": 24,
  "last-7-days": 24 * 7,
  "last-30-days": 0,
};

const SMHI_PERIOD: Record<ObservationWindow, string> = {
  "last-24-hours": "latest-day",
  "last-7-days": "latest-months",
  "last-30-days": "latest-months",
};

interface SmhiStation {
  key: string; // station id
  name: string;
  latitude: number;
  longitude: number;
  active: boolean;
}

interface SmhiStationListResponse {
  station: SmhiStation[];
}

interface SmhiValue {
  date: number; // epoch ms
  value: string;
  quality: string;
}

interface SmhiDataResponse {
  value?: SmhiValue[];
}

// Forecast API response shape (verified live 2026-09-01, research.md §1 addendum;
// wind_from_direction/wind_speed_of_gust confirmed live 2026-09-02, 008 research.md §2).
interface SmhiForecastData {
  air_temperature?: number;
  wind_speed?: number;
  wind_from_direction?: number;
  wind_speed_of_gust?: number;
  precipitation_amount_mean?: number;
  cloud_area_fraction?: number; // octas, 0-8 — NOT the same 0-100 scale as the observation API
}

interface SmhiForecastTimeSeriesEntry {
  time: string; // ISO 8601, the interval's end (valid) time
  data: SmhiForecastData;
}

interface SmhiForecastResponse {
  /** ISO 8601 — when this forecast was generated/approved, per SMHI's point-forecast API
   *  (019-dashboard-polish-round-four, research.md §8). */
  approvedTime?: string;
  timeSeries?: SmhiForecastTimeSeriesEntry[];
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

const stationListCache = new Map<number, Promise<SmhiStation[]>>();

async function fetchStationList(parameter: number): Promise<SmhiStation[]> {
  const cached = stationListCache.get(parameter);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/parameter/${parameter}.json`);
      if (!response.ok) return [];
      const data = (await response.json()) as SmhiStationListResponse;
      return data.station ?? [];
    } catch {
      return [];
    }
  })();

  stationListCache.set(parameter, promise);
  return promise;
}

async function nearestActiveStations(
  parameter: number,
  location: { latitude: number; longitude: number },
  count: number
): Promise<(StationInfo & { key: string })[]> {
  const stations = await fetchStationList(parameter);
  return stations
    .filter((s) => s.active)
    .map((s) => ({
      id: s.key,
      key: s.key,
      displayName: s.name?.trim() ? s.name : "Unnamed station",
      latitude: s.latitude,
      longitude: s.longitude,
      distanceKm: haversineKm(location, s),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count);
}

export async function isCovered(
  location: Pick<import("../models/types").Location, "latitude" | "longitude">
): Promise<boolean> {
  const nearest = await nearestActiveStations(TEMPERATURE_PARAM, location, 1);
  return nearest.length > 0 && nearest[0].distanceKm <= COVERAGE_RADIUS_KM;
}

async function fetchStationValues(
  parameter: number,
  stationKey: string,
  window: ObservationWindow
): Promise<SmhiValue[]> {
  const period = SMHI_PERIOD[window];
  const response = await fetch(
    `${BASE_URL}/parameter/${parameter}/station/${stationKey}/period/${period}/data.json`
  );
  if (!response.ok) {
    throw new Error(`SMHI request failed with status ${response.status}`);
  }
  const data = (await response.json()) as SmhiDataResponse;
  return data.value ?? [];
}

function byHour(values: SmhiValue[], transform: (raw: number) => number = (n) => n): Map<number, number> {
  const map = new Map<number, number>();
  for (const v of values) {
    map.set(Math.floor(v.date / 3600_000), transform(Number(v.value)));
  }
  return map;
}

function buildHourlySeries(
  window: ObservationWindow,
  temperatureValues: SmhiValue[],
  precipitationValues: SmhiValue[],
  windValues: SmhiValue[],
  cloudValues: SmhiValue[],
  windDirectionValues: SmhiValue[],
  windGustValues: SmhiValue[]
): WeatherObservation[] {
  const now = Date.now();
  const hoursNeeded = WINDOW_HOURS[window];

  const tempByHour = byHour(temperatureValues);
  const precipByHour = byHour(precipitationValues);
  const windByHour = byHour(windValues);
  // SMHI parameter 16 is already reported in percent — no conversion needed.
  const cloudByHour = byHour(cloudValues);
  const windDirectionByHour = byHour(windDirectionValues);
  const windGustByHour = byHour(windGustValues);

  const currentHour = Math.floor(now / 3600_000);
  const observations: WeatherObservation[] = [];
  for (let i = hoursNeeded - 1; i >= 0; i--) {
    const hourKey = currentHour - i;
    const timestamp = new Date(hourKey * 3600_000).toISOString();
    observations.push({
      timestamp,
      temperature: tempByHour.has(hourKey) ? tempByHour.get(hourKey)! : null,
      precipitation: precipByHour.has(hourKey) ? precipByHour.get(hourKey)! : null,
      windSpeed: windByHour.has(hourKey) ? windByHour.get(hourKey)! : null,
      cloudCoverPercent: cloudByHour.has(hourKey) ? cloudByHour.get(hourKey)! : null,
      windDirection: windDirectionByHour.has(hourKey) ? windDirectionByHour.get(hourKey)! : null,
      windGust: windGustByHour.has(hourKey) ? windGustByHour.get(hourKey)! : null,
    });
  }
  return observations;
}

interface SmhiForecastFetchResult {
  timeSeries: SmhiForecastTimeSeriesEntry[];
  issuedAt: string | null;
}

async function fetchForecastTimeSeries(
  location: { latitude: number; longitude: number }
): Promise<SmhiForecastFetchResult> {
  try {
    const response = await fetch(
      `${FORECAST_BASE_URL}/lon/${location.longitude}/lat/${location.latitude}/data.json`
    );
    if (!response.ok) return { timeSeries: [], issuedAt: null };
    const data = (await response.json()) as SmhiForecastResponse;
    return { timeSeries: data.timeSeries ?? [], issuedAt: data.approvedTime ?? null };
  } catch {
    // Forecast is a best-effort addition to an otherwise-complete observation
    // series — degrade to "no forecast" rather than failing the whole request.
    return { timeSeries: [], issuedAt: null };
  }
}

function buildForecastHourlySeries(
  hoursNeeded: number,
  timeSeries: SmhiForecastTimeSeriesEntry[]
): WeatherObservation[] {
  if (hoursNeeded === 0 || timeSeries.length === 0) return [];

  const byHourEntry = new Map<number, SmhiForecastData>();
  for (const entry of timeSeries) {
    byHourEntry.set(Math.floor(Date.parse(entry.time) / 3600_000), entry.data);
  }

  const currentHour = Math.floor(Date.now() / 3600_000);
  const forecast: WeatherObservation[] = [];
  for (let i = 1; i <= hoursNeeded; i++) {
    const hourKey = currentHour + i;
    const timestamp = new Date(hourKey * 3600_000).toISOString();
    const data = byHourEntry.get(hourKey);
    forecast.push({
      timestamp,
      temperature: data?.air_temperature ?? null,
      precipitation: data?.precipitation_amount_mean ?? null,
      windSpeed: data?.wind_speed ?? null,
      cloudCoverPercent: data?.cloud_area_fraction !== undefined ? data.cloud_area_fraction * 12.5 : null,
      windDirection: data?.wind_from_direction ?? null,
      windGust: data?.wind_speed_of_gust ?? null,
      isForecast: true,
    });
  }
  return forecast;
}

async function fetchParameterValues(
  parameter: number,
  location: { latitude: number; longitude: number },
  window: ObservationWindow
): Promise<SmhiValue[]> {
  const nearest = await nearestActiveStations(parameter, location, 1);
  if (nearest.length === 0) return [];
  try {
    return await fetchStationValues(parameter, nearest[0].key, window);
  } catch {
    // A missing/failing station for this parameter degrades that field to
    // all-null rather than failing the whole observation request.
    return [];
  }
}

export async function getObservations(
  location: Pick<import("../models/types").Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<ObservationSeries> {
  const nearestTemp = await nearestActiveStations(TEMPERATURE_PARAM, location, 1);
  if (nearestTemp.length === 0) {
    throw new Error("No active SMHI temperature station found");
  }

  const [
    temperatureValues,
    precipitationValues,
    windValues,
    cloudValues,
    windDirectionValues,
    windGustValues,
  ] = await Promise.all([
    fetchStationValues(TEMPERATURE_PARAM, nearestTemp[0].key, window),
    fetchParameterValues(PRECIPITATION_PARAM, location, window),
    fetchParameterValues(WIND_PARAM, location, window),
    fetchParameterValues(CLOUD_PARAM, location, window),
    fetchParameterValues(WIND_DIRECTION_PARAM, location, window),
    fetchParameterValues(WIND_GUST_PARAM, location, window),
  ]);

  const observations = buildHourlySeries(
    window,
    temperatureValues,
    precipitationValues,
    windValues,
    cloudValues,
    windDirectionValues,
    windGustValues
  );

  const forecastHoursNeeded = FORECAST_HOURS[window];
  const { timeSeries: forecastTimeSeries, issuedAt: forecastIssuedAt } =
    forecastHoursNeeded > 0 ? await fetchForecastTimeSeries(location) : { timeSeries: [], issuedAt: null };
  const forecastObservations = buildForecastHourlySeries(forecastHoursNeeded, forecastTimeSeries);

  return {
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      displayName: "",
      source: "current-position",
    },
    window,
    observations: [...observations, ...forecastObservations],
    status: "ready",
    forecastIssuedAt: forecastObservations.length > 0 ? forecastIssuedAt : null,
  };
}

export async function getNearestStations(
  location: Pick<import("../models/types").Location, "latitude" | "longitude">,
  count: number
): Promise<StationInfo[]> {
  const nearest = await nearestActiveStations(TEMPERATURE_PARAM, location, count);
  return nearest.map((s) => ({
    id: s.id,
    displayName: s.displayName,
    distanceKm: s.distanceKm,
    latitude: s.latitude,
    longitude: s.longitude,
  }));
}
