# Implementation Plan: Direct-Generation Icon Prompt Tool

**Branch**: `070-dalle-icon-prompt-tool` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/070-dalle-icon-prompt-tool/spec.md`

## Summary

A local Python CLI tool, run alongside the existing sprite-sheet-and-split pipeline, that builds
one complete image-generation prompt from a maintainer-specified combination (weather type,
temperature band, day/night, optional wind condition), calls OpenAI's `gpt-image-2.5-flare` image
generation directly for exactly one image, verifies both real alpha transparency and — via a
separate call to Claude's vision input, a deliberately different provider than generation — that
the image's actual content matches what was requested, and saves the result (plus its prompt and
verdict) to a scratch output directory that never touches the app's shipped icon set. The character (woman/couple/boy/girl) is auto-derived from the
weather type via the app's existing category mapping. Character consistency is pursued through
detailed, reused text description alone — no reference image is attached. The first validation run
targets the woman character's six dry-weather types, reusing and adapting the already-authored
per-column prompt text in `docs/weathericons_prompts_legacy/` (preferring the dedicated `*b_*`
overcast/fog files' more detailed wording for those two specific types, since that's the exact
distinction that has been hard to get right).

## Technical Context

**Language/Version**: Python 3.9+ (matching `docs/weathericons/`'s existing scripts; verified
working with both the system's default 3.9 and 3.13 in this environment)

**Primary Dependencies**: `openai` (generation) and `anthropic` (content verification — a
deliberately different provider, research.md §2) — both official Python SDKs, added via the
script's own docstring `pip install` note, matching `split_icons.py`'s existing convention, not a
project-wide dependency file; `pillow` (already used by the existing icon scripts, reused here for
the local alpha-transparency check)

**Storage**: Local filesystem only — a new scratch directory (e.g.
`docs/weathericons/generated/`) for generated images + their prompt/verdict metadata; no database

**Testing**: Python `unittest`/manual invocation (matching this repo's existing convention — the
`docs/weathericons/*.py` scripts have no automated test suite of their own); the "test" for this
feature is the tool's own dry-run/verification behavior, exercised via quickstart.md, not
JS/Vitest (this tool has no interaction with the TypeScript app at all)

**Target Platform**: Local developer machine (Windows, per this repo's environment), invoked
directly via `python`/`py`, not part of any CI or deployed artifact

**Project Type**: Single-project web app for the shipped product; this feature is a standalone
tooling script under `docs/weathericons/`, entirely outside `src/`/`tests/`

**Performance Goals**: N/A — a manually-invoked, one-image-per-run local tool; no latency/
throughput target beyond "faster than writing the prompt and calling the API by hand"

**Constraints**: Must never write into `src/assets/weather-icons-v2/` or
`docs/weathericons/icons_split/` (FR-008); must never write a credential to a committed file
(FR-007 — reads `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` from the environment, optionally via a
git-ignored local `.env` file, matching this repo's existing `.gitignore` `.env`/`.env.*`
patterns); the exact generation/vision-model names should be configurable/overridable values, not
hardcoded permanently — model lineups change frequently and a name hardcoded today may be retired
by the time this tool
is next touched (research.md §3).

**Scale/Scope**: One new Python script (plus a small, one-time-authored prompt-fragment data
module extracted from the legacy `.txt` files) under `docs/weathericons/`; zero changes to `src/`,
`tests/`, or the shipped application.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no gates to evaluate. N/A.

## Project Structure

### Documentation (this feature)

```text
specs/070-dalle-icon-prompt-tool/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

No `/contracts/` in the usual REST/RPC sense — this tool's only "interface" is its CLI argument
shape and the external OpenAI API calls it makes, both documented in data-model.md/quickstart.md
rather than as a separate contracts directory (consistent with how prior tooling-only features in
this repo, e.g. 067/068's icon-regeneration steps, skipped `/contracts/`).

### Source Code (repository root)

```text
docs/weathericons/
├── generate_icon.py           # NEW: the CLI tool itself
├── icon_prompt_data.py        # NEW: one-time-extracted prompt fragments (base style, per-band
│                               # clothing text, per-type/time scene text — sourced from
│                               # weathericons_prompts_legacy/), plus the category→character map
├── generated/                 # NEW: scratch output directory (git-ignored), one PNG + one JSON
│                               # metadata file (prompt used, parameters, verdicts) per run
├── split_icons.py              # unchanged (existing pipeline)
├── resize_icons.py             # unchanged (existing pipeline)
└── sheet-manifest.json         # unchanged (existing pipeline)

docs/weathericons_prompts_legacy/   # unchanged — read-only source material for icon_prompt_data.py

.gitignore                     # add `docs/weathericons/generated/` (scratch output, never
                                # committed) alongside the existing `.env`/`.env.*` patterns
```

**Structure Decision**: New standalone files under the existing `docs/weathericons/` tooling
directory — no changes anywhere under `src/` or `tests/`, and no new top-level directory.

## Complexity Tracking

*No constitution violations — table not needed.*
