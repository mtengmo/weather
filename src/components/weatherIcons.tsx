import { Cloud, CloudRain, CloudSnow, Moon, Sun, Wind, type LucideIcon } from "lucide-react";
import type { WeatherCondition } from "../services/weatherCondition";

interface WeatherIconInfo {
  Icon: LucideIcon;
  label: string;
}

/** Maps each WeatherCondition to a recognizable icon and accessible label (FR-006). */
export const WEATHER_ICONS: Record<WeatherCondition, WeatherIconInfo> = {
  "clear-day": { Icon: Sun, label: "Clear" },
  "clear-night": { Icon: Moon, label: "Clear" },
  cloudy: { Icon: Cloud, label: "Cloudy" },
  rainy: { Icon: CloudRain, label: "Rain" },
  windy: { Icon: Wind, label: "Windy" },
  snowy: { Icon: CloudSnow, label: "Snow" },
};
