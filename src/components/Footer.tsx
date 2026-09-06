import { useState } from "react";
import { APP_VERSION } from "../services/appVersion";
import { dataSourceDisclosure } from "../services/format";
import type { ObservationSeries } from "../models/types";
import PrivacyNotice from "./PrivacyNotice";
import HowItWorks from "./HowItWorks";

interface FooterProps {
  series: ObservationSeries | null;
  lastUpdated: string | null;
  /** Display names of every forecast source that genuinely contributed to the current blend —
   *  same set WeatherIconOverview.tsx already applies before merging (021-dashboard-polish-
   *  round-six, research.md §2; widened to support a third source in 022-met-forecast-source). */
  contributingForecastSourceNames: string[];
}

export default function Footer({ series, lastUpdated, contributingForecastSourceNames }: FooterProps) {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  // dataSourceDisclosure now embeds its own freshness time inline (019-dashboard-polish-round-four,
  // FR-012) — no separate "· Updated HH:MM" suffix here anymore, to avoid showing the same time
  // twice when the forecast's own freshness falls back to this same lastUpdated value.
  const disclosure =
    series !== null ? dataSourceDisclosure(series, lastUpdated, contributingForecastSourceNames) : null;

  return (
    <footer className="app-footer">
      {disclosure !== null && <span className="app-footer-source">{disclosure}</span>}
      <span>Weather History v{APP_VERSION}</span>
      <button type="button" onClick={() => setHowItWorksOpen(true)}>
        How this works
      </button>
      <button type="button" onClick={() => setPrivacyOpen(true)}>
        Privacy
      </button>
      {howItWorksOpen && <HowItWorks onClose={() => setHowItWorksOpen(false)} />}
      {privacyOpen && <PrivacyNotice onClose={() => setPrivacyOpen(false)} />}
    </footer>
  );
}
