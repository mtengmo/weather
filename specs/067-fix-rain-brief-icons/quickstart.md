# Quickstart: Stop Brief Morning Rain From Marking the Whole Day, and Refresh Weather Icon Artwork

## Prerequisites

```sh
npm install
```

No new JS dependencies. US2 requires the already-installed `pillow`/`numpy`/`scipy` Python
packages the existing `docs/weathericons/split_icons.py` script depends on.

## US1 — Brief morning rain no longer marks the whole day

**Automated validation**: `tests/unit/dailyAggregation.test.ts` covers the new hour-count/
heavy-override fields directly; `tests/integration/weatherIconOverview.test.tsx` covers the
Uppsala-shaped end-to-end scenario via `WeeklyForecastStrip`.

```sh
npm test -- dailyAggregation weatherIconOverview
```

**Manual validation**:

1. `npm run dev`, open the app for a location whose forecast has a short daytime rain shower
   (e.g. via the debug panel or a mocked response) confined to 2-3 morning hours, dry the rest of
   the day.
2. Confirm that day's card in the weekly forecast strip shows a dry condition/icon.
3. Repeat with rain spanning most of the daytime hours — confirm it still shows rain.
4. Repeat with a brief but heavy rain event (a large amount concentrated in one or two hours) —
   confirm it still shows rain, not dry.

## US2 — Regenerate weather icon artwork

**Steps**:

```sh
cd docs/weathericons
python split_icons.py --sheets-dir . --out-dir icons_split
```

Confirm the script reports `124/124` icons written with no `❌` (missing content) lines — a
`⚠️` (alpha-variation warning) line is worth a manual look but not necessarily a blocker.

```sh
# From repo root — compare the new output's filenames against what's already shipped
diff <(ls docs/weathericons/icons_split | sort) <(ls src/assets/weather-icons-v2 | sort)
```

The diff should be empty (same 124 filenames). Then copy the new artwork over the shipped set:

```sh
cp docs/weathericons/icons_split/*.png src/assets/weather-icons-v2/
```

**Manual validation**: `npm run dev`, browse the app's various weather-icon-showing views (Today
card, weekly strip, hourly timeline, 3-day/7-day overview) and confirm the new artwork renders
with no missing images.

## Full regression

```sh
npm run lint
npx tsc -b
npm test
npm run build
```
