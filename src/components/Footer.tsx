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
  const disclosure = series !== null ? dataSourceDisclosure(series) : null;

  return (
    <footer className="app-footer">
      {disclosure !== null && (
        <span className="app-footer-source">
          {disclosure}
          {lastUpdated !== null &&
            ` · Updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
        </span>
      )}
      <span>Weather History v{APP_VERSION}</span>
      <button type="button" onClick={() => setPrivacyOpen(true)}>
        Privacy
      </button>
      {privacyOpen && <PrivacyNotice onClose={() => setPrivacyOpen(false)} />}
    </footer>
  );
}
