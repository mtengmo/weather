# Quickstart: Replace Weather Icons With Character Artwork

## Prerequisites

- Python 3 with `pillow`, `numpy`, `scipy` installed:
  ```sh
  pip install pillow numpy scipy
  ```
- Node/npm project already set up.

## 1. Correct the manifest, then split the 19 sheets into 124 icons

```sh
cd docs/weathericons
python split_icons.py
```

Expected outcome: `docs/weathericons/icons_split/` contains **124** PNGs named
`weather_{type}_{day|night}_{band}.png`, and the script's own summary line reads
`124/124 ikoner skrivna` with no `❌` lines (a few `⚠️` lines are worth a manual look but not
necessarily wrong — see `splitting-guide.md`'s troubleshooting section).

## 2. Verify a few icons visually

```sh
python -c "from PIL import Image; im = Image.open('icons_split/weather_thunder_day_mild.png'); print(im.mode, im.size)"
```

Expect `RGBA`. Open a handful of the output files directly to confirm they look like distinct,
tightly-cropped icons (no bleed from a neighboring cell, no leftover background).

## 3. Verify the resolver in isolation

```sh
npx vitest run tests/unit/smhiSymbolIcons.test.ts
```

Expected outcome: all cases pass, including:
- Every one of the 27 SMHI codes resolves to a defined weather type and, given a temperature, to
  defined day/night artwork.
- A rain code at a `frozen`/`cold` temperature, and a snow code at a `mild`/`warm`/`hot`
  temperature, both resolve to the `sleet` artwork for that band (FR-005).
- A `windy` condition still resolves to the lucide `Wind` icon, unchanged (research.md §5).
- A missing temperature still resolves to artwork (the `nearzero` default band), not `null`
  (FR-006).

## 4. Verify end-to-end in the app

```sh
npm run dev
```

Open the app and confirm the new character artwork appears in all four places: the Today card, the
24-hour timeline's "Weather" row, the Details table, and the 7-day forecast strip — for the same
location/moment, the same weather type and temperature band should look identical across all four.

## 5. Full verification before commit

```sh
npm run lint
npx tsc -b
npm test
npm run build
```

All four must be clean, matching this project's existing pre-commit convention.
