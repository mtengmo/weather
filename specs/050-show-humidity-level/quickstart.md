# Quickstart: Humidity Level Indicator

## Validate

```sh
npm test -- smhiProvider
npm test -- weatherApi
npm test -- weatherIconOverview
```

Confirm:
- An SMHI forecast entry with `relative_humidity` maps to `WeatherObservation.relativeHumidity`.
- An SMHI station observation with a parameter-6 reading maps the same way.
- The Today card shows "Humidity Dry/Normal/High" for readings in each band, and nothing when there's no reading.

## Full verification

```sh
npm run lint
npx tsc -b
npm test
npm run build
```
