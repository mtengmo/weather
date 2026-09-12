# Phase 1 Data Model: Direct-Generation Icon Prompt Tool

This is a standalone Python tool with no database — "data model" here means the CLI's input shape,
the prompt-fragment data module, and the output artifacts it produces.

## CLI input: `IconRequest`

| Field | Type | Values | Required | Notes |
|---|---|---|---|---|
| `weather_type` | enum | the 12 existing types: `clear`, `nearly-clear`, `variable`, `cloudy`, `overcast`, `fog`, `rain-light`, `rain-heavy`, `thunder`, `sleet`, `snow-light`, `snow-heavy` | yes | Same 12 types `sheet-manifest.json` already defines |
| `band` | enum | `frozen`, `cold`, `nearzero`, `mild`, `warm`, `hot` | yes | Same 6 bands the existing icon set uses |
| `time` | enum | `day`, `night` | yes | |
| `wind` | enum | `calm` (default), `windy` | no | FR-002 |

**Derived, not input** (FR-001a): `character = CATEGORY_CHARACTER[TYPE_CATEGORY[weather_type]]` —
one of `kvinna`/`par`/`pojke_gubbe`/`flicka`.

**Validation**: `overcast`/`fog` are only valid when `TYPE_CATEGORY[weather_type] == "dry"` (they
already only exist for `kvinna` today) — an invalid combination (e.g. `overcast` derived to a
non-`kvinna` character) is a startup validation error, not a silent fallback.

## Prompt fragment data (`icon_prompt_data.py`)

| Structure | Shape | Source |
|---|---|---|
| `BASE_STYLE` | one string | Shared opening paragraph, every legacy `.txt` file (identical across all of them) |
| `GUARDRAILS` | list of strings | The shared `CRITICAL` paragraphs (no invented accessories/precipitation/wind, transparency/spacing, clothing consistency framing) — adapted from sprite-sheet-grid framing to single-image framing (e.g. "every column of this sheet" → "this image") |
| `TYPE_CATEGORY` | `dict[str, str]` | 12 weather types → one of `dry`/`rain`/`thunder-sleet`/`snow`, restating `sheet-manifest.json`'s `code_mapping` |
| `CATEGORY_CHARACTER` | `dict[str, str]` | `dry→kvinna`, `rain→par`, `thunder-sleet→pojke_gubbe`, `snow→flicka` |
| `CLOTHING_BY_BAND` | `dict[character][band] → str` | Each file's `Character(s) for this sheet:` line, extracted once |
| `SCENE_BY_TYPE_BAND_TIME` | `dict[type][band][day\|night] → str` | Each file's numbered per-column entries — **band-specific, not just type-specific** (e.g. `frozen`'s columns append "breath visibly frozen"; `hot`'s likely add heat-appropriate cues) — corrected during planning after comparing the `frozen` and `mild` legacy files side by side. `overcast`/`fog` sourced from the `*b_*` files specifically for each band. |
| `WIND_FRAGMENT` | one string | New text for 070 (research.md §5) — not present in any legacy file |

**Validation**: every `(character, band)` pair referenced by `CATEGORY_CHARACTER`/`TYPE_CATEGORY`
must have a `CLOTHING_BY_BAND` entry, and every `(weather_type, band)` pair valid for that type's
category must have a `SCENE_BY_TYPE_BAND_TIME` entry for both `day` and `night` — checked once at
module import time (fail fast on a data-entry mistake, not at prompt-build time for some future
combination).

## Output artifacts

Per successful or failed run, written to `docs/weathericons/generated/`:

| File | Contents |
|---|---|
| `{type}_{time}_{band}[_windy].png` | The generated image (only written if the API call itself succeeded — even a check-failing image is saved, so the maintainer can see what went wrong) |
| `{same-name}.json` | `{ "parameters": {...}, "prompt": "...", "transparency_check": {"pass": bool, "unique_alpha_values": int}, "content_check": {"pass": bool, "reason": "..."}, "generated_at": "ISO timestamp" }` |

No file is ever written under `src/assets/weather-icons-v2/` or `docs/weathericons/icons_split/`
(FR-008) — `docs/weathericons/generated/` is a new, separate, git-ignored directory.
