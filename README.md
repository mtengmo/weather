# Weather History

A client-only web app showing observed (historical) weather for your current location and saved favorite places: an hourly graph for the last 24 hours, and a daily high/low/average + total-precipitation graph for the last 7 days, each with a "View details" table. Pick from three visual themes — Midnight, Ivory, and Glass — via the theme picker. No backend or account required — favorites, unit preference, and theme are stored locally in your browser.

See [specs/001-weather-history-locations/](specs/001-weather-history-locations/) for the full specification, plan, and design docs.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL. The app will ask for location permission on load; you can also search for and save favorite places without granting location access.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and build a production bundle to `dist/`
- `npm run preview` — preview the production build locally
- `npm test` — run the Vitest test suite once
- `npm run test:watch` — run tests in watch mode
- `npm run lint` — run ESLint

## Data source

Historical weather observations come from [SMHI's open data API](https://opendata.smhi.se/) for locations in Sweden (real station observations, plus the 5 nearest stations shown as comparison series), with the free [Open-Meteo](https://open-meteo.com/) API as an automatic fallback everywhere else. Place search uses Open-Meteo's geocoding API. No API key is required for either. See [research.md](specs/001-weather-history-locations/research.md) for details.

## Deployment

The app is a static build with no backend, deployed to GitHub Pages via [.github/workflows/deploy.yml](.github/workflows/deploy.yml): every push to `main` runs the test suite, builds with `npm run build`, and publishes `dist/` to Pages. `vite.config.ts`'s `base` is set to `/weather/` to match this repository's Pages URL (`https://<user>.github.io/weather/`) — update it if the repository is ever renamed or forked under a different name.
