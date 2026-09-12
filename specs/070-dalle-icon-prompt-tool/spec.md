# Feature Specification: Direct-Generation Icon Prompt Tool

**Feature Branch**: `070-dalle-icon-prompt-tool`

**Created**: 2026-09-12

**Status**: Draft

**Input**: User description: "could we make a prompt tool to sync dalle api request with new images directly? and generate one image per prompt? take into more parameters, like wind and so also"

## Clarifications

### Session 2026-09-12

- Q: What should the new "wind" parameter actually produce? → A: Wind becomes a new selectable
  dimension the tool weaves into the generated prompt text (alongside the weather type,
  temperature band, and day/night dimensions that already exist), not a forced expansion that
  multiplies the entire existing icon set.
- Q: Should this tool replace the current sprite-sheet-and-split workflow, or run alongside it? →
  A: Run alongside it. The existing sprite-sheet + splitting pipeline (063-replace-weather-icons,
  067-fix-rain-brief-icons) is unchanged; this is a separate, additional tool for generating
  individual icons directly.
- Q: Should a run always regenerate everything, or let the maintainer pick a specific subset? → A:
  Selectable subset — the maintainer specifies exactly which combination(s) to generate per run,
  keeping image-generation API costs and iteration time under their control.
- Q: When the script generates an icon, how should it decide whether the result is actually
  correct (e.g. that "overcast" really looks like a solid opaque cloud and not foggy haze)? → A:
  Automated — send the generated image to a vision-capable AI along with a description of what it
  was supposed to show, and have it judge pass/fail, so the tool can report a verdict without a
  person having to look at every image.
- Q: Should this feature's scope now be narrowed to the one-by-one pilot itself (just the woman
  character's dry-weather types), or does the tool still need to cover every character, every
  weather type, and the wind parameter, with the woman/dry-weather run being only the first
  validation pass? → A: Full scope remains as originally specified — the woman/dry-weather run is
  the initial way of proving the tool works, not a boundary on what it must ultimately support.
- Q: Should the character (woman, couple, boy, or girl) be something the maintainer explicitly
  picks per run, or should the tool always derive it automatically from the weather type using the
  app's existing category mapping? → A: Auto-derived — the tool picks the character from the
  weather type using the same category → character mapping the app already uses (dry→woman,
  rain→couple, thunder/sleet→boy, snow→girl); it is never a separate input the maintainer sets.
- Q: Should the tool attach a saved reference image of the character to keep it visually
  consistent (matching the existing legacy prompts' "a reference image IS attached" approach), or
  generate purely from a text description each time? → A: Text-only — the tool describes the
  character in words every time; no reference image is stored or attached, and consistency is
  pursued entirely through detailed, consistent prompt wording.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate one finished icon image directly from a prompt, with more control over what it depicts (Priority: P1)

The person maintaining the app's weather icon artwork wants to produce a single new icon image
without first creating a full sprite sheet and running the splitting script — for example, to add
character artwork for a weather condition that doesn't have any yet (like "windy," which today
falls back to a plain generic icon), or to try out a new visual variation. They want to specify
which weather type, temperature band, day or night, and now also wind condition the image should
depict, have a tool build the full, consistent prompt text for that exact combination (reusing the
established style/character/consistency rules already written down for this app's icon set), send
it to an image-generation service, and save the one resulting image — without generating anything
else they didn't ask for.

**Why this priority**: The only story in this feature — a self-contained tool for the person doing
icon-art maintenance, requested directly by them.

**Independent Test**: Can be fully tested by running the tool with one specific combination of
parameters (e.g. "windy, cold, day"), confirming it produces exactly one new image file matching
that combination, and confirming the app's existing icon set and pipeline are completely untouched
by running it. The first real validation pass for this tool is the woman character's six
dry-weather types (clear/nearly-clear/variable/cloudy/overcast/fog) — the exact combination that
has been hardest to get visually right by hand — but passing that pass is proof the tool works, not
the boundary of what it supports.

**Acceptance Scenarios**:

1. **Given** the maintainer specifies a weather type, a temperature band, and day or night, **When**
   they run the tool, **Then** it builds one complete prompt describing exactly that combination
   (reusing the app's already-established base style, character description, canvas, transparency,
   and consistency rules) and requests exactly one generated image for it.
2. **Given** the maintainer also specifies a wind condition (e.g. windy vs. calm), **When** the
   prompt is built, **Then** the wind condition is reflected in the generated prompt's description
   (e.g. windswept motion cues) alongside the other parameters, without needing a separate tool or
   process for that dimension.
3. **Given** the tool successfully receives a generated image back, **When** it saves the result,
   **Then** it verifies the image actually has real transparency (not just a white/checkered
   background) AND sends the image to a vision-capable AI, along with a description of what that
   combination of parameters was supposed to depict, to judge whether the image actually matches —
   only reporting the generation as successful when both checks pass.
3a. **Given** the vision check judges an image does not match what it was supposed to depict (e.g.
   an "overcast" request that came back looking like fog), **When** the tool reports the outcome,
   **Then** it clearly reports a content-verification failure, including the vision check's stated
   reason, distinct from a transparency failure or a request failure.
4. **Given** the maintainer runs the tool for one specific combination, **When** it completes,
   **Then** only that one image is produced — no other combinations are generated, and no existing
   icon file anywhere in the app or its source sprite sheets is modified or deleted.
5. **Given** the image-generation request fails or times out, **When** the tool reports the
   outcome, **Then** it clearly tells the maintainer the request failed (and why, if known) rather
   than silently producing no file or a broken one.
6. **Given** the maintainer runs the tool without valid credentials configured, **When** they run
   it, **Then** the tool tells them clearly that credentials are missing/invalid, without ever
   requiring a credential to be written into a file that could be committed to the repository.

---

### Edge Cases

- Running the tool twice for the exact same combination produces two independent generation
  requests (the underlying service doesn't guarantee identical output for identical input) — the
  maintainer decides whether to keep, discard, or compare the results; the tool doesn't need to
  detect or prevent "duplicate" requests.
- A combination whose resulting image doesn't pass the transparency check or the content-
  verification check is reported as a failure needing a manual look, the same way a `⚠️`/`❌`
  result from the existing splitting script already is — the tool doesn't need to automatically
  retry generation on its own.
- The vision-based content check is itself an AI judgment, not a guarantee — a maintainer can still
  choose to manually override and accept an image the check flagged, or discard one it approved;
  the tool's verdict is a strong signal to speed up review, not a final, unappealable gate.
- The tool's output must never be able to overwrite a file also produced by the existing
  sprite-sheet pipeline without the maintainer clearly knowing that's happening.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool MUST accept, per invocation, an explicit set of parameters describing what
  the generated image should depict, at minimum: weather type/condition, temperature band, and
  day-or-night — matching the dimensions the app's existing icon set is already organized around.
- **FR-001a**: The tool MUST automatically derive which character (woman, couple, boy, or girl)
  appears in the generated image from the requested weather type, using the app's existing
  category → character mapping (dry→woman, rain→couple, thunder/sleet→boy, snow→girl) — the
  character is never a separate parameter the maintainer sets directly.
- **FR-002**: The tool MUST additionally accept a wind condition as a selectable parameter, and
  reflect it in the generated prompt's description alongside the other parameters.
- **FR-003**: The tool MUST generate exactly one image per invocation, for exactly the combination
  of parameters specified — it MUST NOT generate additional combinations the maintainer didn't ask
  for in that run.
- **FR-004**: The tool MUST build its prompt text by reusing the app's already-established prompt
  conventions (base visual style, character description, canvas/framing rules, transparency
  requirement, and character-consistency instructions) rather than inventing new wording each time
  the parameters change. Character consistency is pursued entirely through this detailed,
  consistently-worded text description — no reference image is stored or attached to the request.
- **FR-005**: The tool MUST verify the returned image has genuine alpha transparency before
  reporting the generation as successful, matching the app's existing manual verification practice.
- **FR-005a**: The tool MUST additionally verify the returned image's actual visual content against
  what the requested parameters were supposed to depict, by sending the image plus a description of
  the expected content to a vision-capable AI and using its judgment as the content-correctness
  verdict — this is required precisely because getting this right by eye alone (e.g. distinguishing
  "overcast" from "fog") has been difficult in practice.
- **FR-006**: The tool MUST clearly report failure (with the reason, when available) if the
  image-generation request fails, times out, fails the transparency check, or fails the
  content-verification check — never silently producing nothing or a broken file without
  explanation, and never reporting success when either check failed.
- **FR-007**: The tool MUST read any required service credentials from a source that is never
  committed to the repository (e.g. an environment variable or an explicitly git-ignored local
  file) and MUST fail with a clear message if credentials are missing or rejected, rather than
  prompting for them to be hardcoded.
- **FR-008**: The tool MUST NOT modify, delete, or overwrite any file belonging to the existing
  sprite-sheet-and-split icon pipeline (063-replace-weather-icons, 067-fix-rain-brief-icons) — its
  output is saved separately from that pipeline's files, and the maintainer decides if/when/how to
  bring a generated image into the app's shipped icon set.
- **FR-009**: The tool is a maintainer-run, local development tool — it MUST NOT be part of the
  deployed application, and its use MUST NOT require or introduce any change to the app's runtime
  behavior, dependencies, or bundle.

### Key Entities

- **Icon generation request**: One maintainer-specified combination of parameters (weather type,
  temperature band, day/night, wind condition) that the tool turns into one prompt and one
  generated image — never a batch or a fixed matrix run automatically. The character is not part
  of this input; it's derived from the weather type.
- **Generated icon image**: The single image file the tool produces per request, saved separately
  from the app's shipped icon set until the maintainer chooses to incorporate it, along with its
  content-verification verdict (pass/fail plus reason).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A maintainer can go from "I want an icon depicting X" to a saved candidate image file
  in a single tool invocation, without manually writing prompt text by hand each time.
- **SC-002**: Running the tool for one combination never changes anything else in the app's
  existing shipped icon set or source sprite sheets — verified by the repository showing zero
  unrelated file changes after a run.
- **SC-003**: 100% of images the tool reports as "successful" have both verified real alpha
  transparency AND a passing vision-based content-verification verdict; either check failing is
  always reported as a failure, never as a success.
- **SC-004**: The maintainer can request any single specific combination (including a wind
  condition) without triggering generation of any other combination, in 100% of runs.

## Assumptions

- The image-generation service is an OpenAI-family image API (DALL·E / `gpt-image-1`), consistent
  with the app's existing prompt-authoring documentation (`docs/weathericons/vaderikoner-dalle-
  addendum.md`), which already describes generating one character image per prompt this way.
- The wind parameter is a simple selectable condition (e.g. "windy" vs. "calm") reflected as
  additional descriptive text in the prompt (e.g. windswept hair/clothing motion cues) — consistent
  in spirit with how the existing temperature-band and precipitation-category dimensions are each
  expressed as prompt text today, not a new structural axis requiring its own separate image layer.
- This is a local, developer/maintainer-run command-line tool (matching the existing
  `docs/weathericons/*.py` scripts' shape and audience) — not a UI, not a backend service, and not
  something end users of the weather app ever interact with.
- Output file naming only needs to be distinguishable from the existing shipped icon set and from
  other tool-generated images (e.g. by parameter values and a timestamp or an explicit output
  path/name the maintainer provides) — the exact naming scheme is a planning-phase detail, not a
  business requirement.
- The maintainer already has (or will obtain) their own API credentials for the image-generation
  service; provisioning or paying for that access is outside this feature's scope.
- The prompt text the tool builds per combination is adapted from the app's existing, already
  battle-tested per-column prompt wording (`docs/weathericons_prompts_legacy/`) and the additional
  guardrails documented in `docs/weathericons/vaderikoner-dalle-addendum.md` — restructured for a
  single standalone image rather than a multi-column sprite-sheet grid, not rewritten from scratch.
- The vision-based content-verification check is a separate request to a vision-capable AI model
  (which may be from the same provider as the image-generation service, or a different one) — the
  exact model/service choice is a planning-phase decision, not a business requirement.
- Since consistency is pursued through text description alone (no reference image), some visual
  drift between generated images of the same character across separate runs is expected and
  accepted — the maintainer's review (and the vision-based content check, which judges the
  requested weather content, not identity-matching) is the safety net for that, not a guaranteed
  pixel-identical character every time.
