# Quickstart: Cartoon Weather Companion

## Prerequisites

- Python 3 with `Pillow` and `numpy` installed (already used by `docs/logos/split_symbols*.py`;
  confirmed available in this environment).
- Node/npm project already set up (`npm install` already run for this repo).

## 1. Generate the 25 character image assets

```sh
python docs/weathericons/split_character_sheet.py
```

Expected outcome: `src/assets/weather-characters/` contains 25 PNGs named
`character_{precip}_{band}.png` (`precip` ∈ `dry,rain,thunder,sleet,snow`; `band` ∈
`frozen,cold,mild,warm,hot`), each autotrimmed to its character's own bounding box with a clean
alpha channel (verify with e.g.
`python -c "from PIL import Image; im=Image.open('src/assets/weather-characters/character_rain_mild.png'); print(im.mode, im.size)"`
— expect `RGBA`).

## 2. Verify the mapping module in isolation

```sh
npx vitest run tests/unit/weatherCharacterIcons.test.ts
```

Expected outcome: all cases pass, covering:
- Each of the 5 precipitation categories × 5 temperature bands resolves to its own distinct asset.
- A `windy` condition falls back to the `dry` category (per spec.md Edge Cases).
- A `null` condition returns no character (no asset, no thrown error).
- Temperature exactly on a band boundary (e.g. 0°C, 25°C) resolves to the warmer adjacent band.

## 3. Verify end-to-end in the app

```sh
npm run dev
```

Open the app, select any location with current data. On the Overview's "Today" card:
- A small character illustration appears beside the existing weather icon.
- Its outfit visibly matches current conditions (e.g. raincoat if raining, warm jacket if cold).
- The existing temperature/high-low/description text is unobscured and unchanged in position.

To see multiple variants without waiting for real weather changes, temporarily mock
`currentCondition`/`currentTemperature` in `tests/integration/weatherIconOverview.test.tsx`'s test
harness, or exercise `tests/unit/weatherCharacterIcons.test.ts` directly (step 2) for full 25-way
coverage.

## 4. Full verification before commit

```sh
npm run lint
npx tsc -b
npm test
npm run build
```

All four must be clean, matching this project's existing pre-commit convention.
