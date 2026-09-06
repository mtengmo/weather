import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Moon,
  Snowflake,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { WeatherCondition } from "../services/weatherCondition";

interface WeatherIconInfo {
  Icon: LucideIcon;
  label: string;
}

/** Maps each WeatherCondition to a recognizable icon and accessible label (FR-006;
 * thunderstorm/foggy/sleet added 022-met-forecast-source, US3; light/heavy rain+snow replace
 * the previous flat rainy/snowy entries, 032-dashboard-polish-round-seven, US5, research.md §7 —
 * `heavy-rain`/`heavy-snow` keep the icons `rainy`/`snowy` used before, so the more commonly-seen
 * case looks unchanged; `sleet` moves to `CloudHail` since `CloudDrizzle` is now `light-rain`'s). */
export const WEATHER_ICONS: Record<WeatherCondition, WeatherIconInfo> = {
  "clear-day": { Icon: Sun, label: "Clear" },
  "clear-night": { Icon: Moon, label: "Clear" },
  cloudy: { Icon: Cloud, label: "Cloudy" },
  "light-rain": { Icon: CloudDrizzle, label: "Light rain" },
  "heavy-rain": { Icon: CloudRain, label: "Rain" },
  windy: { Icon: Wind, label: "Windy" },
  "light-snow": { Icon: Snowflake, label: "Light snow" },
  "heavy-snow": { Icon: CloudSnow, label: "Snow" },
  thunderstorm: { Icon: CloudLightning, label: "Thunderstorm" },
  foggy: { Icon: CloudFog, label: "Fog" },
  sleet: { Icon: CloudHail, label: "Sleet" },
};
