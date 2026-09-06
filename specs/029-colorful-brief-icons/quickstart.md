# Quickstart: Colorful Daily Brief Icon

## Automated validation

```bash
TZ=UTC npx vitest run
```

Expect an updated/new assertion that the Today card's icon wrapper carries the
`weather-condition-{condition}` class matching its derived condition.

## Manual / live validation

1. `npm run dev`.
2. Load any location currently showing a clear/sunny condition; confirm the Today card's icon
renders in the same yellow/orange tone the 7-day strip's clear-day icon already uses (not the
page's default text color).
3. Switch the app's theme (Display menu) through all three options; confirm the icon's color
adapts and stays legible in each, matching the corresponding icon elsewhere on the page.
4. Confirm the icon's size and position are unchanged from before — only the color differs.
