import { useState } from "react";
import type { WeatherWarning } from "../models/types";

interface WarningBannerProps {
  warnings: WeatherWarning[];
  /** Dismisses one specific warning by its own id, hiding it in this browser for as long as it
   *  remains that exact warning (032-dashboard-polish-round-seven, US4). */
  onDismiss: (id: string) => void;
}

/** A short "starts in X" phrase for a warning that hasn't gone active yet
 *  (045-show-upcoming-smhi, research.md §4) — hours for anything under a day, otherwise a
 *  day-level phrase, since a viewer planning around "will it arrive tomorrow" cares more about
 *  the day than the exact hour once it's that far out. */
function startsInLabel(validFrom: string): string {
  const hours = Math.max(0, Math.round((Date.parse(validFrom) - Date.now()) / 3_600_000));
  if (hours < 1) return "starts within the hour";
  if (hours < 24) return `starts in ${hours}h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "starts tomorrow" : `starts in ${days} days`;
}

/**
 * A persistent, collapsible banner for the viewed location's currently-active official weather
 * warnings — leads with the most severe (already sorted by `getWarningsForLocation`), expandable
 * to the full list (028-severe-weather-warnings, US1/US2). Renders nothing when there are no
 * active (undismissed) warnings, matching `TodaySummaryCard`'s own "nothing to show" convention.
 * Each listed warning can be individually dismissed — App.tsx filters dismissed ids out of the
 * `warnings` this component receives, so a dismissed warning simply stops appearing here
 * (032-dashboard-polish-round-seven, US4, replacing the original "not dismissible" design note).
 */
export default function WarningBanner({ warnings, onDismiss }: WarningBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (warnings.length === 0) return null;

  const leading = warnings[0];
  const moreCount = warnings.length - 1;

  return (
    <section className="warning-banner" aria-label="Weather warnings">
      <div
        className={`warning-banner-summary warning-level-${leading.severityCode.toLowerCase()}${leading.isActive ? "" : " warning-upcoming"}`}
      >
        <button
          type="button"
          className="warning-banner-summary-toggle"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          <span className="warning-banner-severity">{leading.severityLabel}</span>
          <span className="warning-banner-title">{leading.title}</span>
          {!leading.isActive && (
            <span className="warning-banner-upcoming-label">{startsInLabel(leading.validFrom)}</span>
          )}
          {moreCount > 0 && <span className="warning-banner-more">+{moreCount} more</span>}
        </button>
        <button
          type="button"
          className="warning-banner-dismiss"
          aria-label={`Dismiss warning: ${leading.title}`}
          onClick={() => onDismiss(leading.id)}
        >
          ×
        </button>
      </div>
      {expanded && (
        <div className="warning-banner-details">
          {warnings.map((warning) => (
            <article
              key={warning.id}
              className={`warning-banner-item warning-level-${warning.severityCode.toLowerCase()}${warning.isActive ? "" : " warning-upcoming"}`}
            >
              <div className="warning-banner-item-header">
                <h3 className="warning-banner-item-title">
                  {warning.severityLabel}: {warning.title}
                  {!warning.isActive && (
                    <span className="warning-banner-upcoming-label"> — {startsInLabel(warning.validFrom)}</span>
                  )}
                </h3>
                <button
                  type="button"
                  className="warning-banner-dismiss"
                  aria-label={`Dismiss warning: ${warning.title}`}
                  onClick={() => onDismiss(warning.id)}
                >
                  ×
                </button>
              </div>
              <p className="warning-banner-item-area">{warning.areaName}</p>
              <p className="warning-banner-item-validity">
                {warning.isActive ? "Since" : "From"}{" "}
                {new Date(warning.validFrom).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
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
