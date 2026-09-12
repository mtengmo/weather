import { useTranslation } from "react-i18next";
import type { WeatherMetric } from "../models/types";

interface MetricTabsProps {
  metric: WeatherMetric;
  onChange: (metric: WeatherMetric) => void;
}

// `label` is a translation KEY, not display text — translated at render via `t(m.label)`
// (064-swedish-translation).
const METRICS: { value: WeatherMetric; label: string }[] = [
  { value: "temperature", label: "metricTabs.temperature" },
  { value: "rain", label: "metricTabs.rain" },
  { value: "wind", label: "metricTabs.wind" },
  { value: "cloud", label: "metricTabs.cloud" },
];

export default function MetricTabs({ metric, onChange }: MetricTabsProps) {
  const { t } = useTranslation();
  return (
    <div className="metric-tabs" role="group" aria-label={t("metricTabs.ariaLabel")}>
      {METRICS.map((m) => (
        <button
          key={m.value}
          type="button"
          aria-pressed={metric === m.value}
          onClick={() => onChange(m.value)}
        >
          {t(m.label)}
        </button>
      ))}
    </div>
  );
}
