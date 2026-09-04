import { useState } from "react";
import { APP_VERSION } from "../services/appVersion";
import PrivacyNotice from "./PrivacyNotice";

export default function Footer() {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <footer className="app-footer">
      <span>Weather History v{APP_VERSION}</span>
      <button type="button" onClick={() => setPrivacyOpen(true)}>
        Privacy
      </button>
      {privacyOpen && <PrivacyNotice onClose={() => setPrivacyOpen(false)} />}
    </footer>
  );
}
