# Quickstart: Refresh the Woman Character's Icon Artwork (Sheets 1-6)

## Prerequisites

Reuses the pipeline already set up in 067-fix-rain-brief-icons (`pillow`/`numpy`/`scipy`
installed; `split_icons.py` already patched to run under Python 3.9).

## Steps

```sh
cd docs/weathericons
python split_icons.py --sheets-dir . --out-dir icons_split
```

Confirm the script reports `124/124` written with no `❌` lines (it regenerates everything, but
only the 72 files below are actually used).

```sh
# From repo root — copy only the 72 files corresponding to sheets 1-6's six weather types
cd ../..
for type in clear nearly-clear variable cloudy overcast fog; do
  cp docs/weathericons/icons_split/weather_${type}_*.png src/assets/weather-icons-v2/
done
```

Then shrink just those 72 files (not the other 52) to match the rest of the already-optimized set
— see `docs/weathericons/resize_icons.py`'s `shrink()` function; invoke it against the same
`weather_{clear,nearly-clear,variable,cloudy,overcast,fog}_*` file list rather than its default
whole-directory CLI mode.

**Verification**:

```sh
# Confirm exactly 72 files were touched and the other 52 are untouched
git status --short src/assets/weather-icons-v2/ | wc -l   # expect 72
```

## Full regression

```sh
npm run lint
npx tsc -b
npm test
npm run build
```
