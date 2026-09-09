# Quickstart: Split Informational SMHI Warnings Into the Daily Brief

## Validate

```sh
npm test -- weatherApi
npm test -- warningBanner
npm test -- weatherIconOverview
```

Confirm:
- `getWarningsForLocation` tags a `MESSAGE`-level warning with `isInformational: true` and a `CLASS_1/2/3` one with `false`.
- `WarningBanner` never renders an informational warning.
- The Today card renders an informational warning's title/description, with no dismiss control.
- A color-coded warning still renders in the banner exactly as before, including the upcoming "starts in X" treatment.

## Full verification

```sh
npm run lint
npx tsc -b
npm test
npm run build
```
