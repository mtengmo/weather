import type { ObservationSeries, ObservationWindow, StationInfo, WeatherObservation } from "../models/types";

const BASE_URL = "https://opendata-download-metobs.smhi.se/api/version/1.0";
const TEMPERATURE_PARAM = 1;
const PRECIPITATION_PARAM = 7;
const WIND_PARAM = 4;
const CLOUD_PARAM = 16; // "procent" per SMHI's own parameter metadata — already 0-100, no conversion needed
const COVERAGE_RADIUS_KM = 50;

const WINDOW_HOURS: Record<ObservationWindow, number> = {
  "last-24-hours": 24,
  "last-7-days": 24 * 7,
  "last-30-days": 24 * 30,
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
  cloudValues: SmhiValue[]
): WeatherObservation[] {
  const now = Date.now();
  const hoursNeeded = WINDOW_HOURS[window];

  const tempByHour = byHour(temperatureValues);
  const precipByHour = byHour(precipitationValues);
  const windByHour = byHour(windValues);
  // SMHI parameter 16 is already reported in percent — no conversion needed.
  const cloudByHour = byHour(cloudValues);

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
    });
  }
  return observations;
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

  const [temperatureValues, precipitationValues, windValues, cloudValues] = await Promise.all([
    fetchStationValues(TEMPERATURE_PARAM, nearestTemp[0].key, window),
    fetchParameterValues(PRECIPITATION_PARAM, location, window),
    fetchParameterValues(WIND_PARAM, location, window),
    fetchParameterValues(CLOUD_PARAM, location, window),
  ]);

  const observations = buildHourlySeries(
    window,
    temperatureValues,
    precipitationValues,
    windValues,
    cloudValues
  );

  return {
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      displayName: "",
      source: "current-position",
    },
    window,
    observations,
    status: "ready",
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
