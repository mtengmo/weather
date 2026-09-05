import { useState } from "react";
import { APP_VERSION } from "../services/appVersion";
import { dataSourceDisclosure } from "../services/format";
import type { ObservationSeries } from "../models/types";
import PrivacyNotice from "./PrivacyNotice";

interface FooterProps {
  series: ObservationSeries | null;
  lastUpdated: string | null;
}

export default function Footer({ series, lastUpdated }: FooterProps) {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  // dataSourceDisclosure now embeds its own freshness time inline (019-dashboard-polish-round-four,
  // FR-012) — no separate "· Updated HH:MM" suffix here anymore, to avoid showing the same time
  // twice when the forecast's own freshness falls back to this same lastUpdated value.
  const disclosure = series !== null ? dataSourceDisclosure(series, lastUpdated) : null;

  return (
    <footer className="app-footer">
      {disclosure !== null && <span className="app-footer-source">{disclosure}</span>}
      <span>Weather History v{APP_VERSION}</span>
      <button type="button" onClick={() => setPrivacyOpen(true)}>
        Privacy
      </button>
      {privacyOpen && <PrivacyNotice onClose={() => setPrivacyOpen(false)} />}
    </footer>
  );
}
