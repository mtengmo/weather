# Quickstart: Swedish Translation Based On Browser Language

## Prerequisites

```sh
npm install i18next react-i18next
```

## 1. Verify translation resource parity

```sh
npx vitest run tests/unit/i18n.test.ts
```

Expected outcome: passes, confirming `en.ts` and `sv.ts` have identical key sets and neither has an
empty-string value.

## 2. Verify Swedish detection and rendering

```sh
npx vitest run tests/integration/appHeader.test.tsx
```

Expected outcome includes a scenario mocking `navigator.language` as `"sv-SE"` and asserting a
representative piece of UI text (e.g. the "Change location" button) renders in Swedish.

## 3. Manual check in the browser

```sh
npm run dev
```

- In your browser's settings, set the preferred language to Swedish (or another language, e.g.
  `sv-FI`) and reload — confirm the whole app (header, Today card, timeline, Details table, 7-day
  strip, warnings, How it works, Privacy notice) renders in Swedish.
- Switch the browser's preferred language back to English (or leave it as a non-Swedish language)
  and reload — confirm the app looks exactly as it does today, in English.

## 4. Full verification before commit

```sh
npm run lint
npx tsc -b
npm test
npm run build
```

All four must be clean, matching this project's existing pre-commit convention.
