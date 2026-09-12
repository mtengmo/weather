# Quickstart: Direct-Generation Icon Prompt Tool

## Prerequisites

```sh
pip install openai pillow
```

Set your OpenAI API key (never commit this):

```sh
# either export it directly...
export OPENAI_API_KEY=sk-...
# ...or put it in a git-ignored .env file (docs/weathericons/.env) and load it before running
```

Optionally override the models used (see research.md §3 — model names change over time):

```sh
export ICON_GEN_MODEL=gpt-image-1        # default
export ICON_VERIFY_MODEL=<a current vision-capable chat model> # confirm the current recommended
                                                                 # name with OpenAI's docs at the
                                                                 # time you run this
```

## First validation run — the woman character's dry-weather types

This is the pilot: the exact six types that have been hardest to get visually right.

```sh
cd docs/weathericons
python generate_icon.py --type clear         --band mild --time day
python generate_icon.py --type nearly-clear  --band mild --time day
python generate_icon.py --type variable      --band mild --time day
python generate_icon.py --type cloudy        --band mild --time day
python generate_icon.py --type overcast      --band mild --time day
python generate_icon.py --type fog           --band mild --time day
```

Each run prints a pass/fail summary (transparency check + content-verification verdict) and writes
one `.png` + one `.json` to `docs/weathericons/generated/`. Open the `cloudy`/`overcast`/`fog`
images side by side and confirm they're visually distinguishable from each other — the specific
thing that's been hard to get right.

## Trying the wind parameter

```sh
python generate_icon.py --type clear --band mild --time day --wind windy
```

Confirm the result shows windswept motion cues (hair/clothing/leaves) that the calm version
doesn't.

## Verifying nothing else was touched

```sh
cd ../..  # repo root
git status --short src/assets/weather-icons-v2/ docs/weathericons/icons_split/
```

Expect no output — this tool must never modify either directory (FR-008/SC-002).

## Full regression

This tool has no interaction with the TypeScript app, so the app's own regression suite
(`npm run lint`, `npx tsc -b`, `npm test`, `npm run build`) is unaffected and doesn't need to be
re-run for this feature — confirmed by the "verifying nothing else was touched" check above.
