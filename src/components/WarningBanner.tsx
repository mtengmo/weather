import { useState } from "react";
import type { WeatherWarning } from "../models/types";

interface WarningBannerProps {
  warnings: WeatherWarning[];
}

/**
 * A persistent, collapsible banner for the viewed location's currently-active official weather
 * warnings — leads with the most severe (already sorted by `getWarningsForLocation`), expandable
 * to the full list (028-severe-weather-warnings, US1/US2). Renders nothing when there are no
 * active warnings, matching `TodaySummaryCard`'s own "nothing to show" convention. Not
 * permanently dismissible within a session — it reflects a real, currently active official
 * warning, so it reappears on every load for as long as the warning stays active (spec
 * Assumptions: "Dismissal").
 */
export default function WarningBanner({ warnings }: WarningBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (warnings.length === 0) return null;

  const leading = warnings[0];
  const moreCount = warnings.length - 1;

  return (
    <section className="warning-banner" aria-label="Weather warnings">
      <button
        type="button"
        className={`warning-banner-summary warning-level-${leading.severityCode.toLowerCase()}`}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <span className="warning-banner-severity">{leading.severityLabel}</span>
        <span className="warning-banner-title">{leading.title}</span>
        {moreCount > 0 && <span className="warning-banner-more">+{moreCount} more</span>}
      </button>
      {expanded && (
        <div className="warning-banner-details">
          {warnings.map((warning) => (
            <article key={warning.id} className={`warning-banner-item warning-level-${warning.severityCode.toLowerCase()}`}>
              <h3 className="warning-banner-item-title">
                {warning.severityLabel}: {warning.title}
              </h3>
              <p className="warning-banner-item-area">{warning.areaName}</p>
              <p className="warning-banner-item-validity">
                Since {new Date(warning.validFrom).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                {warning.validUntil &&
                  ` until ${new Date(warning.validUntil).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`}
              </p>
              <p className="warning-banner-item-description">{warning.description}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
