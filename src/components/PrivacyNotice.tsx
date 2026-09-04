interface PrivacyNoticeProps {
  onClose: () => void;
}

export default function PrivacyNotice({ onClose }: PrivacyNoticeProps) {
  return (
    <div className="privacy-notice" role="dialog" aria-label="Privacy notice">
      <button type="button" className="privacy-notice-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <h2>Privacy</h2>
      <p>
        This app runs entirely in your browser — there is no backend server and no account. Your
        favorite places, last-viewed location, and display preferences (theme, units, toggles) are
        saved only in this browser&apos;s local storage; they are never sent anywhere.
      </p>
      <p>
        Weather data comes directly from SMHI and Open-Meteo&apos;s public APIs, requested by your
        browser each time you view it.
      </p>
      <p>
        This site uses Google Analytics to collect anonymous usage statistics (pages viewed,
        general interaction patterns) to help understand how the app is used.
      </p>
    </div>
  );
}
