# Phase 0 Research: Direct-Generation Icon Prompt Tool

## §1 — Image generation: OpenAI `gpt-image-2.5-flare`, `images.generate`

**Decision**: Use the official `openai` Python SDK's `client.images.generate(...)`, model
`gpt-image-2.5-flare`, with `background="transparent"` and `output_format="png"`.

```python
result = client.images.generate(
    model="gpt-image-2.5-flare",
    prompt=prompt_text,
    size="1024x1024",
    quality="auto",
    background="transparent",
    output_format="png",
)
image_bytes = base64.b64decode(result.data[0].b64_json)
```

**Rationale**: `gpt-image-2.5-flare` (released 2026-09-08, verified via web search) is OpenAI's
current fast, everyday-quality image model — same `images.generate` API shape as its predecessor
`gpt-image-1`, generates roughly 2-4x faster, and is explicitly documented as having better
transparent-background output. The `response_format` parameter isn't supported for this model
family — it always returns `b64_json`, so the tool decodes that directly rather than downloading
from a URL.

**Known risk** (flagged in an OpenAI community bug report about the `gpt-image-1` generation,
found during research; `gpt-image-2.5-flare`'s improved transparency handling should reduce but not
necessarily eliminate this): background-removal on this model family can occasionally cut out other
white/light areas of the artwork it shouldn't, not just the intended background. This is exactly
why FR-005 (alpha-transparency check) and FR-005a (vision-based content check) both exist as
independent safety nets — a technically-transparent image that also accidentally punched a hole
through part of the character would still need to fail the content-verification check.

**Alternatives considered**: The now-superseded `gpt-image-1` — kept as a documented fallback via
`ICON_GEN_MODEL` (§3) rather than removed, in case `gpt-image-2.5-flare` is ever rolled back or
rate-limited differently. `gpt-image-2.5-sunburst` (the higher-fidelity, slower sibling released
the same day) — rejected as the default for this pilot's everyday icon-generation use case, but
also a reasonable `ICON_GEN_MODEL` override if a specific combination needs more precise control.
The image *edit* endpoint (`images.edit`, which accepts an input reference image) — rejected per
the "text-only, no reference image" clarification already recorded in spec.md. Claude/Anthropic as
a generation provider — not possible: Claude has no native image-output model (confirmed via web
search, September 2026) and only produces visuals via SVG/code or by calling an external tool.

## §2 — Content verification: Claude's vision input, a different provider than generation

**Decision**: After the transparency check passes, send the decoded image (as a base64-encoded
`image` content block) plus a short text description of the expected content (built from the same
parameters used for the generation prompt, phrased as a plain question) to Claude via the
Anthropic Messages API, and parse a structured pass/fail + reason from its response (asking it to
answer in a fixed `PASS`/`FAIL: <reason>` format).

```python
message = client.messages.create(
    model=VERIFY_MODEL,  # see §3 — configurable, not hardcoded permanently
    max_tokens=256,
    messages=[{
        "role": "user",
        "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_b64}},
            {"type": "text", "text": verification_question},
        ],
    }],
)
```

**Rationale**: This is the direct implementation of the "automated vision-based content
verification" clarification already recorded in spec.md (FR-005a) — the exact mechanism needed to
catch an "overcast" request that came back looking like fog, without a person reviewing every
image. Verification deliberately uses a *different provider* (Claude) than generation (OpenAI's
`gpt-image-2.5-flare`) — the model that produced an image judging its own output would be a weaker
check than an independent second opinion, and this was an explicit ask from the user rather than
just a technical default.

**Alternatives considered**: OpenAI's own vision-capable chat models (`gpt-4o-mini` or similar,
via `chat.completions.create` with an `image_url` content block) — this was the original design
and remains a documented fallback shape if Claude access is ever unavailable, but was replaced by
request: using the same provider for both generation and verification risks correlated blind
spots (a bias in how the model *describes* what it *generated*), whereas Claude has no stake in
the image having been produced "correctly" by another model.

## §3 — Vision model name: configurable, not hardcoded permanently

**Finding**: Model naming in this space changes frequently — as of this research (September 2026),
OpenAI released `gpt-image-2.5-flare`/`gpt-image-2.5-sunburst` on 2026-09-08, superseding
`gpt-image-1`, and Anthropic's current lineup is the Claude 5 family plus Haiku 4.5
(`claude-haiku-4-5-20251001`) — fast and vision-capable, a reasonable default for this
cost-sensitive, per-image verification call. A name that's current today may be deprecated by the
next time this tool is touched.

**Decision**: The vision-verification model name (`ICON_VERIFY_MODEL`, defaulting to
`claude-haiku-4-5-20251001`) and the image-generation model name (`ICON_GEN_MODEL`, defaulting to
`gpt-image-2.5-flare`) are both read from environment variables with a documented default, rather
than hardcoded with no override — so a future model deprecation is a one-line environment change,
not a code change. Both `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` are required up front
(`require_api_keys()`) rather than discovering the second one is missing only after the first
(paid) generation call has already succeeded.

**Rationale**: Directly serves FR-009's "no change to the app's runtime" framing extended to the
tool's own maintainability — a maintainer-run tool that breaks the moment OpenAI retires a model
name is a worse outcome than one extra environment variable.

## §4 — Prompt content: extracted from the legacy per-column `.txt` files, not re-parsed at runtime

**Finding**: `docs/weathericons_prompts_legacy/` contains one `.txt` file per (character, band)
sheet, each with: a shared base-style paragraph, several `CRITICAL` guardrail paragraphs (no
invented precipitation/wind/accessories, clothing consistency, transparency, spacing), a
`Character(s) for this sheet:` line (the band-specific clothing description), and a numbered list
of per-column weather-scene descriptions (day mood / night mood) for that character's 6 (kvinna) or
2 (par/pojke_gubbe/flicka) weather-type columns. A dedicated `*b_*` file exists for `kvinna`'s
overcast (column 5) and fog (column 6) specifically, with substantially more detailed, contrastive
wording (e.g. explicitly stating overcast is "100% OPAQUE... NO haze, NO soft edges" vs. fog's
"semi-TRANSPARENT... soft, diffuse, see-through edges") — this is the app's own prior fix attempt
at exactly the distinction the user says is still hard to get right.

**Decision**: One-time-extract these fragments into a small, human-reviewable Python data module
(`docs/weathericons/icon_prompt_data.py`) rather than regex-parsing the `.txt` files at tool
runtime:
- `BASE_STYLE` / the shared `CRITICAL` guardrail paragraphs (style, no-invented-accessories,
  no-invented-precipitation, no-invented-wind, transparency/spacing, clothing-consistency framing)
  — copied once, kept as close to verbatim as adapting from "sprite sheet column" framing to
  "single image" framing allows.
- `CATEGORY_CHARACTER = {"dry": "kvinna", "rain": "par", "thunder-sleet": "pojke_gubbe", "snow": "flicka"}`
  and `TYPE_CATEGORY` (the 12 weather types → one of those 4 categories) — the same mapping
  `sheet-manifest.json`'s `code_mapping` already encodes, restated for direct lookup.
- `CLOTHING_BY_BAND[character][band]` — the `Character(s) for this sheet:` line's clothing
  description, one entry per (character, band) combination that exists today.
- `SCENE_BY_TYPE_BAND_TIME[type][band][day|night]` — the per-column scene description. **Confirmed
  band-specific, not shared across bands** — comparing `01_kvinna_frozen.txt` and
  `04_kvinna_mild.txt` side by side shows the frozen band's columns append "breath visibly frozen"
  that the mild band's columns don't have; other bands likely have their own small band-appropriate
  additions (e.g. a hot-band sweat/sunburn cue). Sourced from the `*b_*` file for `overcast`/`fog`
  (kvinna only, one `*b_*` file per band) and from the main numbered list for every other type.

**Rationale**: A one-time, reviewable extraction is easier to verify for accuracy (a person can
diff the extracted text against the source `.txt` files once) than trusting a runtime parser to
correctly slice numbered-list items out of free-form prose forever; it also naturally lets the
`*b_*` file's improved overcast/fog wording simply *be* the data for those two types, with no
runtime "which file wins" logic needed.

**Alternatives considered**: Runtime parsing of the `.txt` files directly — rejected as needless
complexity and fragility (the files are prose, not a structured format) for content that only needs
extracting once and rarely changes.

## §5 — Wind parameter: an additive descriptive fragment, not a new character axis

**Decision**: A `--wind {calm,windy}` CLI flag (default `calm`, matching the existing prompts'
"default to calm, still air... unless told otherwise" guardrail). When `windy`, append one
additional sentence to the built prompt (e.g. "windswept effect: hair and clothing blown sideways,
a few loose leaves or debris swirling nearby") — otherwise the existing "no invented wind effects"
guardrail sentence is included unchanged.

**Rationale**: Matches the "wind is a new selectable dimension the tool weaves into the prompt
text" clarification already recorded in spec.md — additive text, not a new image layer or a
multiplied combinatorial set.

## §6 — Output location and metadata

**Decision**: `docs/weathericons/generated/{type}_{time}_{band}[_windy].png` plus a sibling
`{same-name}.json` recording the full prompt text sent, the parameters requested, the transparency
check result, and the vision-verification verdict + reason. This directory is added to `.gitignore`
(scratch output, never committed) — matching how `icons_split/` is already excluded from commits
(067/068 both deliberately left it untracked).

**Rationale**: Satisfies FR-008 (never overwrite/touch the shipped pipeline's files) unambiguously
— a different directory entirely — while keeping every generated candidate's full context
alongside it for the maintainer's manual review (edge case: "the tool's verdict is a strong signal
to speed up review, not a final, unappealable gate").
