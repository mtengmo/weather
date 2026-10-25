import { pointInPolygon, type GeoGeometry } from "./geo";

const BASE = "https://wpt-a.smhi.se/backend_seacoast";
export const MAX_AREA_DISTANCE_KM = 150;
/** Coastal areas have ids below this; larger ids are other (lake/sea) polygons. */
const MAX_COASTAL_ID = 200;

export interface CoastalArea {
  id: number;
  name: string;
  seaDistricts: number[];
  geometry: GeoGeometry;
}

export interface SeaReportTexts {
  overview: string;
  updated: string | null;
  districts: { ids: number[]; text: string }[];
}

export interface AreaForecast {
  id: number;
  name: string;
  sky: string | null;
  winds: { prefix: string | null; text: string }[];
}

export interface SeaReportRaw {
  texts: SeaReportTexts;
  areas: CoastalArea[];
  forecasts: AreaForecast[];
}

export interface SeaReportView {
  overview: string;
  updated: string | null;
  areaName: string | null;
  areaTexts: string[];
  forecast: { sky: string | null; winds: { prefix: string | null; text: string }[] } | null;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const numArray = (v: unknown): number[] => (Array.isArray(v) ? v.filter((n): n is number => typeof n === "number") : []);

export function parseTexts(body: unknown): SeaReportTexts | null {
  if (!isObj(body)) return null;
  const overview = str(body.overview);
  if (overview === null) return null;
  const districts = (Array.isArray(body.districts) ? body.districts : []).flatMap((d) => {
    if (!isObj(d)) return [];
    const text = str(d.text);
    return text === null ? [] : [{ ids: numArray(d.ids), text }];
  });
  return { overview, updated: str(body.updated), districts };
}

function validGeometry(g: unknown): g is GeoGeometry {
  return isObj(g) && (g.type === "Polygon" || g.type === "MultiPolygon") && Array.isArray(g.coordinates);
}

export function parseAreas(body: unknown): CoastalArea[] {
  if (!isObj(body) || !Array.isArray(body.features)) return [];
  return body.features.flatMap((f): CoastalArea[] => {
    if (!isObj(f) || !isObj(f.properties) || !validGeometry(f.geometry)) return [];
    const { id, name } = f.properties;
    const seaDistricts = numArray(f.properties.seaDistricts);
    if (typeof id !== "number" || id >= MAX_COASTAL_ID || typeof name !== "string" || seaDistricts.length === 0) return [];
    return [{ id, name, seaDistricts, geometry: f.geometry }];
  });
}

export function parseForecasts(body: unknown): AreaForecast[] {
  if (!Array.isArray(body)) return [];
  return body.flatMap((a): AreaForecast[] => {
    if (!isObj(a) || typeof a.id !== "number") return [];
    const overview = isObj(a.overview) ? a.overview : {};
    const winds = (Array.isArray(overview.textsWind) ? overview.textsWind : []).flatMap((w: unknown) => {
      if (!isObj(w)) return [];
      const text = str(w.text);
      return text === null ? [] : [{ prefix: str(w.timePrefix), text }];
    });
    return [{ id: a.id, name: str(a.name) ?? "", sky: str(overview.textSkyAndTempRange), winds }];
  });
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

function minVertexDistanceKm(geometry: GeoGeometry, lat: number, lon: number): number {
  const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
  let best = Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) best = Math.min(best, haversineKm(lat, lon, y, x));
  }
  return best;
}

/** The coastal area containing the point, else the nearest within `maxKm` (by closest polygon vertex). */
export function pickCoastalArea(
  areas: CoastalArea[],
  lat: number,
  lon: number,
  maxKm = MAX_AREA_DISTANCE_KM
): { area: CoastalArea; distanceKm: number } | null {
  const coastal = areas.filter((a) => a.seaDistricts.length > 0 && a.id < MAX_COASTAL_ID);
  const point = { latitude: lat, longitude: lon };
  const inside = coastal.find((a) => pointInPolygon(point, a.geometry));
  if (inside) return { area: inside, distanceKm: 0 };
  let best: { area: CoastalArea; distanceKm: number } | null = null;
  for (const area of coastal) {
    const d = minVertexDistanceKm(area.geometry, lat, lon);
    if (d <= maxKm && (best === null || d < best.distanceKm)) best = { area, distanceKm: d };
  }
  return best;
}

export function buildSeaReport(raw: SeaReportRaw, lat: number, lon: number, language: "sv" | "en"): SeaReportView {
  const picked = pickCoastalArea(raw.areas, lat, lon);
  const view: SeaReportView = {
    overview: raw.texts.overview,
    updated: raw.texts.updated,
    areaName: null,
    areaTexts: [],
    forecast: null,
  };
  if (!picked) return view;
  const { area } = picked;
  view.areaName = area.name;
  view.areaTexts = [
    ...new Set(raw.texts.districts.filter((d) => d.ids.some((id) => area.seaDistricts.includes(id))).map((d) => d.text)),
  ];
  const fc = language === "sv" ? raw.forecasts.find((f) => f.id === area.id) : undefined;
  if (fc && (fc.sky !== null || fc.winds.length > 0)) view.forecast = { sky: fc.sky, winds: fc.winds };
  return view;
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`SMHI sea report: ${res.status}`);
  return res.json();
}

/** The text report is required; the area polygons and area forecasts are optional extras. */
export async function fetchSeaReport(language: "sv" | "en", signal?: AbortSignal): Promise<SeaReportRaw> {
  const [texts, areas, forecasts] = await Promise.allSettled([
    getJson(`${BASE}/seacomment/texts/${language}`, signal),
    getJson(`${BASE}/seadistricts/coastlines-lakes`, signal),
    language === "sv" ? getJson(`${BASE}/area-forecast/all`, signal) : Promise.resolve([]),
  ]);
  const parsed = texts.status === "fulfilled" ? parseTexts(texts.value) : null;
  if (parsed === null) throw new Error("SMHI sea report: no text");
  return {
    texts: parsed,
    areas: areas.status === "fulfilled" ? parseAreas(areas.value) : [],
    forecasts: forecasts.status === "fulfilled" ? parseForecasts(forecasts.value) : [],
  };
}
