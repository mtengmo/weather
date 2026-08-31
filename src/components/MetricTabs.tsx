import type { WeatherMetric } from "../models/types";

interface MetricTabsProps {
  metric: WeatherMetric;
  onChange: (metric: WeatherMetric) => void;
}

const METRICS: { value: WeatherMetric; label: string }[] = [
  { value: "temperature", label: "Temperature" },
  { value: "rain", label: "Rain" },
  { value: "wind", label: "Wind" },
  { value: "cloud", label: "Cloud coverage" },
];

export default function MetricTabs({ metric, onChange }: MetricTabsProps) {
  return (
    <div className="metric-tabs" role="group" aria-label="Weather metric">
      {METRICS.map((m) => (
        <button
          key={m.value}
          type="button"
          aria-pressed={metric === m.value}
          onClick={() => onChange(m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
