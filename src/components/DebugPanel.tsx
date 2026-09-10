import type { MultiSourceForecastEntry } from "../services/weatherApi";

interface DebugPanelProps {
  multiSourceForecast: MultiSourceForecastEntry[];
}

const SOURCES: { key: MultiSourceForecastEntry["source"]; label: string }[] = [
  { key: "smhi", label: "SMHI" },
  { key: "open-meteo", label: "Open-Meteo" },
  { key: "met-no", label: "MET Norway" },
];

/**
 * Raw per-source forecast responses, exactly as each source returned them — for comparing
 * sources directly (e.g. diagnosing a disagreement between SMHI's and another source's
 * prediction for the same hour) without leaving the app. Reuses `multiSourceForecast`, already
 * fetched for the page's own rendering — opening this panel never causes a network request
 * (060-debug-page-bottom, FR-002). Collapsed by default (a `<details>`) so it stays out of the
 * way of the app's normal content.
 */
export default function DebugPanel({ multiSourceForecast }: DebugPanelProps) {
  return (
    <details className="debug-panel">
      <summary>Debug: raw source responses</summary>
      <section aria-label="Debug: raw source responses">
        {SOURCES.map(({ key, label }) => {
          const entry = multiSourceForecast.find((e) => e.source === key);
          return (
            <div key={key} className="debug-panel-source">
              <h3 className="debug-panel-source-title">{label}</h3>
              {entry ? (
                <pre className="debug-panel-raw">{JSON.stringify(entry.rawResponse, null, 2)}</pre>
              ) : (
                <p className="debug-panel-no-data">No data</p>
              )}
            </div>
          );
        })}
      </section>
    </details>
  );
}
