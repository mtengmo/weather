# Quickstart: Severe Weather Warnings

## Prerequisites

- `npm install` already run.
- Check `https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json` shortly
before testing to see which Swedish counties currently have an active warning (the set changes
day to day) — pick a location inside one of those areas to exercise the "banner shows" path.

## Automated validation

```bash
TZ=UTC npx vitest run
```

Expect new/updated tests covering:
- `geo.pointInPolygon` — a point clearly inside a simple polygon, a point clearly outside, a
point near a boundary vertex, and a `MultiPolygon` fixture.
- `weatherApi.getWarningsForLocation` — coverage gating (non-Swedish location → `[]`), validity
filtering (a warning with a future `validFrom`, and one with a past `validUntil`, are both
excluded), and severity sort ordering.
- `WarningBanner` — renders nothing for `[]`; renders the leading warning collapsed; expands to
show every warning in order on interaction.

## Manual / live validation (Playwright, per this session's established practice)

1. `npm run dev`.
2. Fetch the raw warnings feed directly (or via the app's own network tab) to identify a
currently-warned Swedish location/county.
3. Search for and view that location; confirm the banner appears near the top of the page
showing the correct severity and title without any extra interaction.
4. Click/tap the banner; confirm it expands to show the full description, area name, and
validity period.
5. Search for and view an unrelated Swedish location known to have no active warning; confirm no
banner appears and the page is otherwise identical.
6. Search for and view a non-Swedish location (e.g. "Paris"); confirm no banner and no console
errors.
7. Take a screenshot in each of the three states above for the PR/verification record.
