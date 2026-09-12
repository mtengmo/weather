# Quickstart: Direct-Generation Icon Prompt Tool

## Prerequisites

```powershell
pip install openai anthropic pillow
```

Two providers are used deliberately — OpenAI generates the image, Claude independently verifies
it (research.md §2) — so both keys are required. Set them for the current shell session (never
commit either):

```powershell
# PowerShell (this repo's primary shell) — lasts only for this session/window
$env:OPENAI_API_KEY = "sk-..."
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

```sh
# bash equivalent, if you're using Git Bash / WSL instead
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
```

To persist them across sessions instead of retyping every time, either set them as permanent
Windows environment variables (`setx OPENAI_API_KEY "sk-..."` / `setx ANTHROPIC_API_KEY "sk-ant-..."`
— takes effect in *new* terminals only, not the current one) or put them in a git-ignored `.env`
file (`docs/weathericons/.env`, already covered by this repo's `.env`/`.env.*` `.gitignore`
pattern) and load it yourself before running the tool.

Optionally override the models used (see research.md §3 — model names change over time):

```powershell
$env:ICON_GEN_MODEL = "gpt-image-2.5-flare"           # default
$env:ICON_VERIFY_MODEL = "claude-haiku-4-5-20251001"  # default — confirm still current at the
                                                        # time you run this
```

## First validation run — the woman character's dry-weather types

This is the pilot: the exact six types that have been hardest to get visually right.

```powershell
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

```powershell
python generate_icon.py --type clear --band mild --time day --wind windy
```

Confirm the result shows windswept motion cues (hair/clothing/leaves) that the calm version
doesn't.

## Verifying nothing else was touched

```powershell
cd ../..  # repo root
git status --short src/assets/weather-icons-v2/ docs/weathericons/icons_split/
```

Expect no output — this tool must never modify either directory (FR-008/SC-002).

## Full regression

This tool has no interaction with the TypeScript app, so the app's own regression suite
(`npm run lint`, `npx tsc -b`, `npm test`, `npm run build`) is unaffected and doesn't need to be
re-run for this feature — confirmed by the "verifying nothing else was touched" check above.
