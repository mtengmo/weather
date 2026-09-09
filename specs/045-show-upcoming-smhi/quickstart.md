# Quickstart: Show Upcoming Weather Warnings

## Prerequisites

- `npm install` already run.
- No new env vars or backend services required.

## Validate the filter/model change

1. Run the existing/updated unit tests for `getWarningsForLocation`:
   ```sh
   npm test -- weatherApi
   ```
2. Confirm: a warning with `approximateStart` ~20 hours in the future is now included in the result with `isActive: false`; one ~72 hours out is still excluded; one already active still has `isActive: true`; one already ended is still excluded.

## Validate the banner rendering

1. Run the component test suite:
   ```sh
   npm test -- WarningBanner
   ```
2. Confirm: given a mix of one active + one upcoming warning, the banner renders the active one first, the upcoming one visually/textually marked with its expected start time, and severity ordering holds within each group.

## Manual check (optional, if a real upcoming warning is published for a test location)

1. `npm run dev`, open the app for a location currently covered by an SMHI warning that starts in the next 48h (or temporarily point the dev fetch at a mocked response with a future `approximateStart`).
2. Confirm the warning banner shows it labeled as upcoming (e.g. "starts in Xh"), and that once its start time passes (or the mock is adjusted to make it past), it displays the same way an active warning does today, with no other manual step.

## Full verification before commit

```sh
npm run lint
npm run build
npm test
```
