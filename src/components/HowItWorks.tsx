interface HowItWorksProps {
  onClose: () => void;
}

export default function HowItWorks({ onClose }: HowItWorksProps) {
  return (
    <div className="privacy-notice" role="dialog" aria-label="How this works">
      <button type="button" className="privacy-notice-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <h2>How this works</h2>
      <p>
        This app shows weather history and forecast for your current location and any places
        you've saved as favorites — what's already happened, and what's expected next.
      </p>
      <p>
        Use the <strong>24 Hours</strong>, <strong>3 Days</strong>, and <strong>7 Days</strong>{" "}
        tabs to change how far back and forward each view looks — from an hour-by-hour look at
        today to a week-long overview.
      </p>
      <p>
        On every chart, a solid line or bar is an <strong>observed</strong> reading — something
        that already happened — while a dashed one is a <strong>forecast</strong>: a prediction
        for a time that hasn't arrived yet.
      </p>
      <p>
        Weather data comes from SMHI (Sweden's national weather service), Open-Meteo, and MET
        Norway. For Swedish locations the app prefers real station observations and blends
        forecasts from all three sources when more than one has data; elsewhere it falls back to
        Open-Meteo.
      </p>
      <p>
        A small <strong>UV</strong> badge appears on the weather icon for any already-happened
        hour whose UV index was high enough to matter — it only ever reflects real measurements,
        never a forecast guess.
      </p>
      <p>
        If Sweden's weather service has an official warning active for a saved location — storms,
        flooding, water shortage, and similar — a banner appears near the top of the page
        summarizing it, expandable for the full details.
      </p>
    </div>
  );
}
