import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Snowflake,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { WeatherCondition } from "../services/weatherCondition";

interface WeatherIconInfo {
  Icon: LucideIcon;
  /** A translation KEY (not display text) — consumers must call `t(iconInfo.label)` themselves
   *  (064-swedish-translation) rather than rendering this value directly, since this module has
   *  no React tree to hook `useTranslation()` into. */
  label: string;
}

/** Maps each WeatherCondition to a recognizable icon and accessible label (FR-006;
 * thunderstorm/foggy/sleet added 022-met-forecast-source, US3; light/heavy rain+snow replace
 * the previous flat rainy/snowy entries, 032-dashboard-polish-round-seven, US5, research.md §7 —
 * `heavy-rain`/`heavy-snow` keep the icons `rainy`/`snowy` used before, so the more commonly-seen
 * case looks unchanged; `sleet` moves to `CloudHail` since `CloudDrizzle` is now `light-rain`'s;
 * `partly-cloudy` splits off the lighter half of the previous single "cloudy" entry,
 * 038-granular-weather-icons-and-graph-header, US1 — no day/night variant, matching `cloudy`'s
 * own existing day/night-agnostic pattern). */
export const WEATHER_ICONS: Record<WeatherCondition, WeatherIconInfo> = {
  "clear-day": { Icon: Sun, label: "weatherCondition.clearDay" },
  "clear-night": { Icon: Moon, label: "weatherCondition.clearNight" },
  "partly-cloudy": { Icon: CloudSun, label: "weatherCondition.partlyCloudy" },
  cloudy: { Icon: Cloud, label: "weatherCondition.cloudy" },
  "light-rain": { Icon: CloudDrizzle, label: "weatherCondition.lightRain" },
  "heavy-rain": { Icon: CloudRain, label: "weatherCondition.heavyRain" },
  windy: { Icon: Wind, label: "weatherCondition.windy" },
  "light-snow": { Icon: Snowflake, label: "weatherCondition.lightSnow" },
  "heavy-snow": { Icon: CloudSnow, label: "weatherCondition.heavySnow" },
  thunderstorm: { Icon: CloudLightning, label: "weatherCondition.thunderstorm" },
  foggy: { Icon: CloudFog, label: "weatherCondition.foggy" },
  sleet: { Icon: CloudHail, label: "weatherCondition.sleet" },
};
