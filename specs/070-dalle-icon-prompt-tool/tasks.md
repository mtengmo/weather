# Tasks: Direct-Generation Icon Prompt Tool

**Input**: Design documents from `specs/070-dalle-icon-prompt-tool/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Limited to the deterministic, non-API parts (prompt assembly, character derivation,
transparency check) — matching plan.md's Technical Context decision that the actual
image-generation/vision-verification calls are validated manually via quickstart.md (they cost
real money and call a live external API), not via an automated test suite.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Confirm `pip install openai pillow` succeeds in this environment; confirm `OPENAI_API_KEY`
      can be read from the environment (`python -c "import os; print(bool(os.environ.get('OPENAI_API_KEY')))"`).
- [ ] T002 Add `docs/weathericons/generated/` to `.gitignore` (scratch output, never committed —
      research.md §6), alongside the existing `.env`/`.env.*` patterns already there.

**Checkpoint**: Environment ready; nothing user-story-specific yet.

---

## Phase 2: User Story 1 - Generate one finished icon image directly from a prompt (Priority: P1) 🎯 MVP

**Goal**: A CLI tool that builds one complete prompt from maintainer-specified parameters, calls
`gpt-image-1` for exactly one image, verifies transparency and content correctness, and saves the
result — validated first against the woman character's six dry-weather types.

**Independent Test**: Run the tool for `--type overcast --band mild --time day`, confirm exactly
one new image + one metadata JSON appear in `docs/weathericons/generated/`, confirm the app's
existing icon set and pipeline directories are untouched, and confirm the reported verdict
(transparency + content check) is present and correctly reflects the image.

### Data extraction for User Story 1

- [ ] T003 [P] [US1] Create `docs/weathericons/icon_prompt_data.py` with `TYPE_CATEGORY` (12
      weather types → `dry`/`rain`/`thunder-sleet`/`snow`) and `CATEGORY_CHARACTER`
      (`dry`→`kvinna`, `rain`→`par`, `thunder-sleet`→`pojke_gubbe`, `snow`→`flicka`), restating
      `docs/weathericons/sheet-manifest.json`'s `code_mapping`/sheet list (data-model.md).
- [ ] T004 [US1] In `icon_prompt_data.py`, add `BASE_STYLE` and `GUARDRAILS` (the shared opening
      paragraph and `CRITICAL` paragraphs common to every file in
      `docs/weathericons_prompts_legacy/`), adapted from sprite-sheet-grid framing ("every column
      of this sheet") to single-image framing ("this image") — research.md §4.
- [ ] T005 [US1] In `icon_prompt_data.py`, add `CLOTHING_BY_BAND["kvinna"]` for all six bands
      (`frozen`/`cold`/`nearzero`/`mild`/`warm`/`hot`), extracted verbatim from each
      `docs/weathericons_prompts_legacy/0{1-6}_kvinna_*.txt` file's `Character(s) for this sheet:`
      line.
- [ ] T006 [US1] In `icon_prompt_data.py`, add `SCENE_BY_TYPE_BAND_TIME` for the six dry types
      (`clear`/`nearly-clear`/`variable`/`cloudy`/`overcast`/`fog`) × all six bands × day/night,
      extracted from the numbered column list in each `0{1-6}_kvinna_*.txt` file — **for
      `overcast` and `fog` specifically, use the corresponding `0{1-6}b_kvinna_overcast-fog_*.txt`
      file's more detailed wording instead** (data-model.md, research.md §4) — confirmed
      band-specific (e.g. `frozen`'s columns append "breath visibly frozen"; check each band file
      for its own such additions rather than assuming the `mild` band's wording generalizes).
- [ ] T007 [US1] Add a module-level validation check at the bottom of `icon_prompt_data.py` that
      asserts every `(character, band)` pair implied by `CATEGORY_CHARACTER` has a
      `CLOTHING_BY_BAND` entry and every `(type, band)` pair valid for a populated category has a
      `SCENE_BY_TYPE_BAND_TIME` entry for both `day` and `night` — raising immediately on import if
      not (data-model.md's validation rule).
- [ ] T008 [P] [US1] Add `WIND_FRAGMENT` to `icon_prompt_data.py` — the new windswept-effect prompt
      sentence (research.md §5), not present in any legacy file.

### Tool implementation for User Story 1

- [ ] T009 [US1] Create `docs/weathericons/generate_icon.py` with `argparse` CLI accepting
      `--type` (the 12 weather types), `--band` (6 bands), `--time` (`day`/`night`), `--wind`
      (`calm` default / `windy`) — matching data-model.md's `IconRequest` shape; validate at parse
      time that `overcast`/`fog` are only accepted when they derive to `kvinna` (data-model.md's
      validation rule), and that only types with an available `CLOTHING_BY_BAND` entry for the
      requested band are accepted (fail with a clear message otherwise, per US1's pilot scope
      being kvinna's dry types only for now).
- [ ] T010 [US1] In `generate_icon.py`, add a `build_prompt(request) -> str` function that
      assembles `BASE_STYLE` + `GUARDRAILS` + the derived character's `CLOTHING_BY_BAND` entry +
      the requested `SCENE_BY_TYPE_BAND_TIME` entry + (`WIND_FRAGMENT` if `wind == "windy"`) into
      one final prompt string (FR-004).
- [ ] T011 [US1] In `generate_icon.py`, add a `generate_image(prompt) -> bytes` function calling
      `client.images.generate(model=os.environ.get("ICON_GEN_MODEL", "gpt-image-1"), prompt=prompt,
      size="1024x1024", quality="auto", background="transparent", output_format="png")` and
      decoding `result.data[0].b64_json` (research.md §1); raise a clear, caught exception on
      request failure/timeout (FR-006).
- [ ] T012 [US1] In `generate_icon.py`, add a `check_transparency(image_bytes) -> tuple[bool, int]`
      function reusing `split_icons.py`'s existing `verify_alpha`-style heuristic (open as RGBA,
      count unique alpha values, pass if ≥ 2) — FR-005.
- [ ] T013 [US1] In `generate_icon.py`, add a `verify_content(image_bytes, request) -> tuple[bool, str]`
      function that builds a plain-language description of what `request` was supposed to depict,
      sends it plus the base64-encoded image to
      `client.chat.completions.create(model=os.environ.get("ICON_VERIFY_MODEL", ...), ...)` per
      research.md §2, and parses a pass/fail + reason from the response — FR-005a.
- [ ] T014 [US1] In `generate_icon.py`, wire the pipeline together: build prompt → generate →
      transparency check → content check → write `{type}_{time}_{band}[_windy].png` and its
      sibling `.json` metadata (parameters, prompt, both verdicts, timestamp) to
      `docs/weathericons/generated/` (creating the directory if absent) — never
      `src/assets/weather-icons-v2/` or `docs/weathericons/icons_split/` (FR-008). Print a clear
      pass/fail summary to stdout, including the content-check's reason on failure (FR-006).

### Tests for User Story 1

- [ ] T015 [P] [US1] Create `docs/weathericons/test_icon_prompt_data.py` (plain `unittest`):
      every `(character, band)`/`(type, band)` combination required by `TYPE_CATEGORY`/
      `CATEGORY_CHARACTER` has the expected data entries (the T007 validation, exercised as an
      explicit test rather than only relying on import-time assertion); `overcast`/`fog` entries
      come from the `*b_*`-sourced text (spot-check a distinguishing phrase from each, e.g.
      "100% OPAQUE" for overcast vs. "semi-TRANSPARENT" for fog, to guard against the two ever
      being accidentally swapped or merged).
- [ ] T016 [P] [US1] Create `docs/weathericons/test_generate_icon.py` (plain `unittest`, no network
      calls): `build_prompt` includes the expected clothing/scene/wind fragments for a few sample
      requests and excludes the wind fragment when `wind == "calm"`; `check_transparency` correctly
      passes a synthetic RGBA image with real alpha variation and fails a synthetic fully-opaque
      one (constructed in-test via `PIL.Image.new`, no API call involved).

**Checkpoint**: User Story 1 is fully implemented; ready for the manual, real-API validation pass
below (quickstart.md's woman/dry-weather pilot run) before wider use.

---

## Phase 3: Polish & Cross-Cutting Concerns

- [ ] T017 Run `python -m unittest discover docs/weathericons` (or equivalent) — confirm T015/T016
      pass with zero network calls made.
- [ ] T018 Run quickstart.md's full pilot sequence for real (all six kvinna dry-weather types at
      one band, plus the wind-parameter check) — this costs real API usage, so run it once
      deliberately rather than repeatedly; visually compare the `cloudy`/`overcast`/`fog` outputs
      side by side to confirm they're now clearly distinguishable.
- [ ] T019 Run `git status --short src/assets/weather-icons-v2/ docs/weathericons/icons_split/`
      after the pilot run — confirm zero output (SC-002/FR-008).
- [ ] T020 Confirm no credential ever appears in a tracked file: `git status --short` shows no
      `.env`-like file staged, and `docs/weathericons/generated/` shows as ignored, not untracked
      (`git check-ignore docs/weathericons/generated/`).
- [ ] T021 Update `docs/weathericons/generated/`'s presence in `.gitignore` is committed (T002),
      and commit the new tool + data module + tests (`generate_icon.py`, `icon_prompt_data.py`,
      `test_icon_prompt_data.py`, `test_generate_icon.py`) — **not** anything under
      `docs/weathericons/generated/` itself. This tool has no interaction with the TypeScript app,
      so the app's own version/lint/build/test gates are unaffected and don't need to be re-run or
      version-bumped for this change.

---

## Dependencies & Execution Order

- Setup (T001-T002) has no dependencies.
- Within US1: T003 before T004 before T005 before T006 before T007 (each builds on the previous
  data being present in the same file); T008 is independent of T003-T007 (`[P]`) but must exist
  before T010 uses it.
- T009 depends on T003 (needs `TYPE_CATEGORY`/`CATEGORY_CHARACTER` to validate against).
- T010 depends on T004-T008 (needs the full data module) and T009 (needs the `IconRequest` shape).
- T011, T012, T013 are independent of each other (different functions, `[P]`-eligible) but all
  depend on T009 existing (same file, `generate_icon.py`).
- T014 depends on T010, T011, T012, T013 (wires all of them together).
- T015 depends on T003-T007 (tests the data module). T016 depends on T010, T012 (tests those
  specific functions) — both are `[P]` relative to each other.
- Polish (T017-T021) depends on all of US1 being complete.

## Implementation Strategy

Build the data module first (T003-T008) since everything else depends on it, then the tool's pure
functions (T010-T013, most parallelizable), then wire them together (T014). Write the
no-network-call tests (T015-T016) alongside their corresponding implementation rather than
strictly after, then do exactly one real, deliberate end-to-end run against the live API
(quickstart.md's pilot) — since it costs real money, there's no reason to run it more than once
per meaningful change during this initial build.
