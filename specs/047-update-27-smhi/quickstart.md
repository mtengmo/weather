# Quickstart: Update SMHI Symbol Icons to Ver6 Artwork

## Prerequisites

- Python 3 with Pillow and numpy (already installed this session).
- `docs/logos/symbols_logos_ver6.png` present (already supplied by the user).

## Run the extraction

```sh
python3 docs/logos/split_symbols_ver6.py
```

Produces 27 files under `docs/logos/symbols_ver6_icons/`, named `01-clear.png` … `27-heavy-snowfall.png`.

## Validate the crops before copying them in

1. Spot-check a handful of the trickiest cases visually (dark clouds where the flood-fill background/foreground boundary matters most, plus one two-digit-numeral case): `01-clear.png` (sun rays near cell edge), `06-overcast.png`-equivalent-mapped-code (whichever code the angry gray cloud lands on), `11-thunderstorm.png`, `14-heavy-sleet-showers.png`-equivalent, `21-thunder.png`, `26-moderate-snowfall.png`, `27-heavy-snowfall.png`.
2. Confirm each: no number visible, no checkerboard/box visible against a plain background, icon content intact (no missing chunks), transparent corners.

## Copy into the app and verify

```sh
cp docs/logos/symbols_ver6_icons/*.png src/assets/weather-icons/
npm run lint
npx tsc -b
npm test
npm run build
npm run dev   # manually check the dashboard/Details view for an SMHI-covered location
```

Expect: all existing tests still pass unchanged (no code touched), and the dashboard/Details icons visually show the new ver6 artwork with no checkerboard/box.
