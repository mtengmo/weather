export type LocationSource = "current-position" | "favorite";

export interface Location {
  latitude: number;
  longitude: number;
  displayName: string;
  source: LocationSource;
}

export interface FavoritePlace {
  id: string;
  latitude: number;
  longitude: number;
  displayName: string;
  addedAt: string; // ISO 8601 timestamp
}

export interface WeatherObservation {
  timestamp: string; // ISO 8601 timestamp
  temperature: number | null; // Celsius, as fetched from the provider
  precipitation: number | null; // millimeters, as fetched from the provider
  windSpeed: number | null; // meters per second
  cloudCoverPercent: number | null; // 0-100
  /** true for a predicted point; absent/false for a measured point (005-add-weather-forecast). */
  isForecast?: boolean;
}

export type ObservationWindow = "last-24-hours" | "last-7-days" | "last-30-days";

export type ObservationStatus = "loading" | "ready" | "unavailable";

export interface ObservationSeries {
  location: Location;
  window: ObservationWindow;
  observations: WeatherObservation[];
  status: ObservationStatus;
  /**
   * true when this series' forecast points came from the secondary source via the
   * forecast-only fallback rather than directly from the primary source that supplied the
   * observed data (006-forecast-now-marker). Absent/false in the common case.
   */
  forecastFromFallbackSource?: boolean;
}

export type UnitSystem = "metric" | "imperial";

export const FAVORITES_LIMIT = 10;

/** One day's aggregated point for the 7-/30-day graph: a rolling 24h bucket, not a calendar day. */
export interface DailyAggregate {
  bucketEnd: string; // ISO 8601 timestamp — end of this rolling 24h bucket
  high: number | null;
  low: number | null;
  average: number | null;
  totalPrecipitation: number | null;
  windAverage: number | null;
  cloudAverage: number | null;
  windHigh: number | null;
  windLow: number | null;
  /** true when this bucket's end time is in the future (005-add-weather-forecast). */
  isForecast?: boolean;
}

/** Identity of a nearby physical weather-observation station (SMHI-only). */
export interface StationInfo {
  id: string;
  displayName: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
}

/** A comparison series for one nearby station (User Story 4), alongside a selected location's own series. */
export interface NearbyStationSeries {
  station: StationInfo;
  series: ObservationSeries;
}

/** The user's selected app-wide visual theme (User Story 5). */
export type Theme = "midnight" | "ivory" | "glass";

export const DEFAULT_THEME: Theme = "midnight";

/** Which weather metric the graph currently displays (User Story 2). */
export type WeatherMetric = "temperature" | "rain" | "wind" | "cloud";

export const DEFAULT_METRIC: WeatherMetric = "temperature";

/** How many nearby comparison stations to show, 0-4 (User Story 4). */
export type NearbyStationCount = 0 | 1 | 2 | 3 | 4;

export const DEFAULT_NEARBY_STATION_COUNT: NearbyStationCount = 4;

/** Whether the temperature/wind 7-day/30-day charts show high/low lines alongside the average. */
export type HighLowVisibility = boolean;

export const DEFAULT_HIGH_LOW_VISIBLE: HighLowVisibility = true;
