# Contract: Footer Data-Source and Freshness Disclosure (User Story 6)

## `src/services/format.ts`

```ts
/** The footer's "SMHI observations · Open-Meteo forecast"-style disclosure
 *  (018-dashboard-visual-redesign, FR-013) — a longer-form sibling of the existing
 *  `dataSourceNote`, reusing the same fields. */
export function dataSourceDisclosure(series: {
  primarySource?: "smhi" | "open-meteo";
  forecastFromFallbackSource?: boolean;
}): string | null {
  if (series.primarySource === undefined) return null;
  const observedLabel = series.primarySource === "smhi" ? "SMHI observations" : "Open-Meteo observations";
  const forecastSource = series.forecastFromFallbackSource
    ? (series.primarySource === "smhi" ? "Open-Meteo" : "SMHI")
    : (series.primarySource === "smhi" ? "SMHI" : "Open-Meteo");
  return `${observedLabel} · ${forecastSource} forecast`;
}
```

## `src/components/Footer.tsx`

```tsx
import { APP_VERSION } from "../services/appVersion";
import { dataSourceDisclosure } from "../services/format";
import type { ObservationSeries } from "../models/types";
import PrivacyNotice from "./PrivacyNotice";
import { useState } from "react";

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
```

## `src/App.tsx`

```tsx
<Footer series={series} lastUpdated={lastUpdated} />
```

## `src/index.css`

```css
.app-footer {
  /* existing rule extended, not replaced */
  justify-content: space-between;
}

.app-footer-source {
  color: var(--text-muted);
}
```

## No changes to

- `dataSourceNote` — kept as-is; still used by `WeatherIconOverview`'s and `ObservationChart`'s
  own short in-view notes. `dataSourceDisclosure` is a new, separate, longer-form sibling for the
  footer specifically, not a replacement.
