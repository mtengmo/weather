# Quickstart: Night-Time Moon Variants

## Validate

```sh
npm test -- smhiSymbolIcons
npm test -- weatherIconOverview
```

Confirm: SMHI code 1 at hour 22 resolves to the night moon icon; the same code at hour 12 resolves to the existing day sun icon; codes 5-27 are unaffected at any hour.

## Full verification

```sh
npm run lint
npx tsc -b
npm test
npm run build
```
