# Quickstart: Larger Weather Icons

## 1. Verify the new sizes render

```sh
npx vitest run tests/integration/weatherIconOverview.test.tsx
```

Expected outcome includes assertions that the Today card's icon renders at 64px and the hourly
timeline/Details table/7-day strip icons all render at 44px.

## 2. Manual check in the browser

```sh
npm run dev
```

- Confirm the Today card's icon is visibly larger and still the biggest icon on the page.
- Confirm the hourly timeline still scrolls horizontally with no clipped or overlapping icons.
- Confirm the Details table and 7-day strip icons are visibly larger with no layout breakage.
- Trigger a `windy` condition (or check an existing forecast that includes one) and confirm the
  fallback lucide icon is the same size as the character artwork beside it.

## 3. Full verification before commit

```sh
npm run lint
npx tsc -b
npm test
npm run build
```

All four must be clean, matching this project's existing pre-commit convention.
