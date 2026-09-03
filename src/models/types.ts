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
  /** Degrees (0-360), direction the wind is blowing FROM (008-timeline-dashboard-redesign). */
  windDirection?: number | null;
  /** Meters per second, same scale as windSpeed (008-timeline-dashboard-redesign). */
  windGust?: number | null;
  /** Percent (0-100) — feels-like-temperature input only, not its own displayed row (008-timeline-dashboard-redesign). */
  relativeHumidity?: number | null;
  /**
   * Percent (0-100) chance of precipitation, when the source provider supplies it. Only
   * meaningful for forecast points — always treated as absent for observed points regardless
   * of what a provider returns (011-precipitation-chance).
   */
  chanceOfRain?: number | null;
}

export type ObservationWindow = "last-24-hours" | "last-7-days" | "last-30-days";

export type ObservationStatus = "loading" | "ready" | "unavailable";

export interface ObservationSeries {
  location: Location;
  window: ObservationWindow;
  observations: WeatherObservation[];
  status: ObservationStatus;
  /**
   * Which provider supplied this series' observed data (013-overview-default-and-layout).
   * Optional (like `forecastFromFallbackSource` below) so existing test fixtures/mocks that
   * predate this field keep compiling — every real series `weatherApi.ts` produces sets it.
   */
  primarySource?: "smhi" | "open-meteo";
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
  /** Max of the bucket's windGust readings, mirroring windHigh (008-timeline-dashboard-redesign). */
  windGustHigh?: number | null;
  /** Mean of the bucket's derived feels-like values (008-timeline-dashboard-redesign). */
  feelsLikeAverage?: number | null;
  /** Max of the bucket's forecast chanceOfRain readings (011-precipitation-chance). */
  chanceOfRainMax?: number | null;
  /** Set only for a sub-day period bucket (e.g. "Morning"), used as its column label instead
   *  of the weekday name (014-dashboard-usability-fixes, FR-018). */
  subDayLabel?: string;
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
