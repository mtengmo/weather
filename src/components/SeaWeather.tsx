import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Location } from "../models/types";
import { SEA_METRICS, SEA_WEATHER_URL, fetchSeaObservation } from "../services/seaObservations";
import type { SeaMetric, SeaObservation, SeaPoint } from "../services/seaObservations";
import { fetchSeaForecast } from "../services/seaForecast";
import type { SeaForecast } from "../services/seaForecast";

interface SeaWeatherProps {
  location: Location | null;
}

type CardState = { status: "loading" } | { status: "error" } | { status: "done"; data: SeaObservation | null };

type SeaWindow = "24h" | "3d" | "7d";
const WINDOW_DAYS: Record<SeaWindow, number> = { "24h": 1, "3d": 3, "7d": 7 };
const DAY_MS = 86_400_000;

const UNITS: Record<SeaMetric, string> = { waterLevel: "cm", waveHeight: "m", seaTemperature: "°C" };

const formatDay = (ms: number) => new Date(ms).toLocaleDateString([], { weekday: "short", day: "numeric" });
const formatTime = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function SeaCard({
  metric,
  state,
  forecast,
  window,
}: {
  metric: SeaMetric;
  state: CardState;
  forecast: SeaPoint[];
  window: SeaWindow;
}) {
  const { t } = useTranslation();
  const data = state.status === "done" ? state.data : null;
  const last = data?.points[data.points.length - 1];
  const now = last?.time ?? Date.now();
  const from = now - DAY_MS;
  const to = now + WINDOW_DAYS[window] * DAY_MS;
  const rows = [
    ...(data?.points ?? []).map((p) => ({ time: p.time, observed: p.value })),
    ...forecast.filter((p) => p.time >= from && p.time <= to).map((p) => ({ time: p.time, forecast: p.value })),
  ].sort((a, b) => a.time - b.time);

  return (
    <section className="sea-card" aria-label={t(`seaWeather.${metric}`)}>
      <h3>{t(`seaWeather.${metric}`)}</h3>
      {state.status === "loading" && <p role="status">{t("seaWeather.loading")}</p>}
      {state.status === "error" && <p role="status">{t("seaWeather.error")}</p>}
      {state.status === "done" && !last && <p>{t("seaWeather.noStation")}</p>}
      {data && last && (
        <>
          <p className="sea-card-value">
            {last.value.toFixed(metric === "waterLevel" ? 0 : 1)} {UNITS[metric]}
          </p>
          <p className="sea-card-station">
            {t("seaWeather.station", { name: data.station.name, km: Math.round(data.station.distanceKm) })} ·{" "}
            {formatTime(last.time)}
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={rows}>
              <XAxis
                dataKey="time"
                type="number"
                domain={[from, to]}
                allowDataOverflow
                tickFormatter={window === "24h" ? formatTime : formatDay}
                tick={{ fontSize: 12 }}
                minTickGap={40}
              />
              <YAxis domain={["auto", "auto"]} width={36} tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(v) => `${formatDay(Number(v))} ${formatTime(Number(v))}`}
                formatter={(v, name) => [`${Number(v).toFixed(1)} ${UNITS[metric]}`, t(`seaWeather.${String(name)}`)]}
              />
              <ReferenceLine x={now} stroke="var(--text-muted)" strokeDasharray="2 2" />
              <Line name="observed" type="monotone" dataKey="observed" stroke="var(--accent)" dot={false} strokeWidth={2} connectNulls isAnimationActive={false} />
              <Line name="forecast" type="monotone" dataKey="forecast" stroke="var(--accent-2)" dot={false} strokeWidth={2} strokeDasharray="5 4" connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </section>
  );
}

export default function SeaWeather({ location }: SeaWeatherProps) {
  const { t } = useTranslation();
  const [states, setStates] = useState<Record<SeaMetric, CardState>>({
    waterLevel: { status: "loading" },
    waveHeight: { status: "loading" },
    seaTemperature: { status: "loading" },
  });
  const [window, setWindow] = useState<SeaWindow>("24h");
  const [forecast, setForecast] = useState<SeaForecast | null>(null);
  const lat = location?.latitude;
  const lon = location?.longitude;

  useEffect(() => {
    if (lat === undefined || lon === undefined) return;
    const controller = new AbortController();
    setForecast(null);
    fetchSeaForecast(lat, lon, controller.signal)
      .then(setForecast)
      .catch(() => {});
    for (const metric of SEA_METRICS) {
      setStates((s) => ({ ...s, [metric]: { status: "loading" } }));
      fetchSeaObservation(metric, lat, lon, controller.signal)
        .then((data) => setStates((s) => ({ ...s, [metric]: { status: "done", data } })))
        .catch(() => {
          if (!controller.signal.aborted) setStates((s) => ({ ...s, [metric]: { status: "error" } }));
        });
    }
    return () => controller.abort();
  }, [lat, lon]);

  return (
    <section className="sea-weather" aria-label={t("seaWeather.title")}>
      <h2>{t("seaWeather.title")}</h2>
      <div className="sea-window" role="group" aria-label={t("seaWeather.window")}>
        {(["24h", "3d", "7d"] as SeaWindow[]).map((w) => (
          <button key={w} type="button" aria-pressed={window === w} onClick={() => setWindow(w)}>
            {w}
          </button>
        ))}
      </div>
      {!location && <p>{t("seaWeather.noLocation")}</p>}
      {location && SEA_METRICS.map((m) => <SeaCard key={m} metric={m} state={states[m]} forecast={forecast?.[m] ?? []} window={window} />)}
      <p className="sea-weather-more">
        <a href={SEA_WEATHER_URL} target="_blank" rel="noopener noreferrer">
          {t("seaWeather.forecastLink")}
        </a>
      </p>
    </section>
  );
}
