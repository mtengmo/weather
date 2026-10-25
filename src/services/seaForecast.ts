const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";

const HOURLY_VARS = [
  "wave_height",
  "wave_direction",
  "wave_period",
  "wind_wave_height",
  "swell_wave_height",
  "swell_wave_direction",
  "swell_wave_period",
  "sea_surface_temperature",
  "sea_level_height_msl",
  "ocean_current_velocity",
  "ocean_current_direction",
];

/**
 * One hour of marine model data. Every field except `time` may be null.
 * Directions are degrees: waveDirection and swellWaveDirection are where the waves
 * come FROM; currentDirection is where the current is going TOWARD.
 */
export interface MarineHour {
  /** Epoch ms. */
  time: number;
  /** m */
  waveHeight: number | null;
  waveDirection: number | null;
  /** s */
  wavePeriod: number | null;
  windWaveHeight: number | null;
  swellWaveHeight: number | null;
  swellWaveDirection: number | null;
  swellWavePeriod: number | null;
  /** deg C */
  seaTemperature: number | null;
  /** cm relative to mean sea level */
  seaLevelCm: number | null;
  /** m/s */
  currentSpeed: number | null;
  currentDirection: number | null;
}

export interface MarineForecast {
  hours: MarineHour[];
}

type Series = (number | null)[] | undefined;

function currentSpeedFactor(unit: string | undefined): number {
  switch (unit) {
    case "km/h":
      return 1 / 3.6;
    case "kn":
      return 0.5144;
    default:
      return 1; // m/s (or unknown)
  }
}

/** Hourly marine data, 7 days back to 7 days ahead, from the sea cell nearest the point. */
export async function fetchMarineForecast(latitude: number, longitude: number, signal?: AbortSignal): Promise<MarineForecast> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: HOURLY_VARS.join(","),
    past_days: "7",
    forecast_days: "7",
    timeformat: "unixtime",
    cell_selection: "sea",
  });
  const res = await fetch(`${MARINE_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Open-Meteo marine: ${res.status}`);
  const body = (await res.json()) as {
    hourly?: { time?: number[] } & Record<string, Series | number[]>;
    hourly_units?: Record<string, string>;
  };
  const h = body.hourly;
  const times = h?.time ?? [];
  const speedFactor = currentSpeedFactor(body.hourly_units?.ocean_current_velocity);
  const get = (name: string, i: number, scale = 1): number | null => {
    const v = (h?.[name] as Series)?.[i];
    return typeof v === "number" && Number.isFinite(v) ? v * scale : null;
  };
  const hours: MarineHour[] = times.map((t, i) => ({
    time: t * 1000,
    waveHeight: get("wave_height", i),
    waveDirection: get("wave_direction", i),
    wavePeriod: get("wave_period", i),
    windWaveHeight: get("wind_wave_height", i),
    swellWaveHeight: get("swell_wave_height", i),
    swellWaveDirection: get("swell_wave_direction", i),
    swellWavePeriod: get("swell_wave_period", i),
    seaTemperature: get("sea_surface_temperature", i),
    seaLevelCm: get("sea_level_height_msl", i, 100),
    currentSpeed: get("ocean_current_velocity", i, speedFactor),
    currentDirection: get("ocean_current_direction", i),
  }));
  return { hours };
}
