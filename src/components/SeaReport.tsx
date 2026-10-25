import { useTranslation } from "react-i18next";
import { useSeaReport } from "../hooks/useSeaReport";
import { formatClockTime } from "../services/timeFormat";

/** SMHI's sjörapport as plain text, shown at the top of the sea page. Hidden on failure. */
export default function SeaReport({ latitude, longitude }: { latitude: number; longitude: number }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language?.startsWith("sv") ? "sv" : "en";
  const state = useSeaReport(latitude, longitude, language);
  if (state.status !== "ready") return null;
  const { report } = state;
  const updated = report.updated ? new Date(report.updated) : null;

  return (
    <section className="sea-report" aria-label={t("seaReport.title")}>
      <h3 className="sea-report-heading">
        {t("seaReport.title")}
        {updated && !Number.isNaN(updated.getTime()) && (
          <span className="sea-report-updated"> {t("seaReport.updated", { time: formatClockTime(updated) })}</span>
        )}
      </h3>
      <p className="sea-report-overview">{report.overview}</p>
      {report.areaName && <h4 className="sea-report-area">{report.areaName}</h4>}
      {report.areaTexts.map((text) => (
        <p key={text} className="sea-report-text">
          {text}
        </p>
      ))}
      {report.forecast && (
        <p className="sea-report-forecast">
          {report.forecast.sky && <span>{report.forecast.sky} </span>}
          {report.forecast.winds.map((w, i) => (
            <span key={i}>{w.prefix ? `${w.prefix}: ${w.text} ` : `${w.text} `}</span>
          ))}
        </p>
      )}
      <p className="sea-report-source">{t("seaReport.source")}</p>
    </section>
  );
}
