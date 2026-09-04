# Contract: Footer, Version, Privacy Notice, Analytics (User Stories 8 & 9)

## `src/services/appVersion.ts` (new)

```ts
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
```

## `src/components/Footer.tsx` (new)

```tsx
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
```

## `src/components/PrivacyNotice.tsx` (new)

```tsx
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
        saved only in this browser's local storage; they are never sent anywhere.
      </p>
      <p>
        Weather data comes directly from SMHI and Open-Meteo's public APIs, requested by your
        browser each time you view it.
      </p>
      <p>
        This site uses Google Analytics to collect anonymous usage statistics (pages viewed,
        general interaction patterns) to help understand how the app is used.
      </p>
    </div>
  );
}
```

## `src/index.css`

```css
.app-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
  padding: 1rem 0 0.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.privacy-notice {
  /* Same dropdown-panel visual treatment as .location-panel-content — position/backdrop details
     mirror that existing pattern rather than introducing a new one. */
}
```

## `src/App.tsx`

```tsx
import Footer from "./components/Footer";
// ...
return (
  <div className="app">
    {/* ...existing content... */}
    <Footer />
  </div>
);
```

## `index.html`

Add, unmodified, exactly as supplied:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-GPT0MTFG6S"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-GPT0MTFG6S');
</script>
```

Placed in `<head>`, after the existing `<title>` tag.

## No changes to

- Any existing `localStorage`-backed preference service (`units.ts`, `theme.ts`, etc.) — the
  privacy notice only *describes* their existing behavior, it doesn't change it.
