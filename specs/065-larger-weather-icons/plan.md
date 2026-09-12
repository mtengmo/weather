# Implementation Plan: Larger Weather Icons

**Branch**: `065-larger-weather-icons` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/065-larger-weather-icons/spec.md`

## Summary

A pure display-size change at the four places `063-replace-weather-icons` already introduced the
new character artwork: bump each `<img>`'s (and its paired lucide `<Icon>` fallback's) explicit
`width`/`height`/`size` prop. The hourly timeline's grid already lives inside a horizontally-
scrolling container with `min-width: max(900px, 100%)` and `1fr` columns (confirmed in
`src/index.css`) — so a larger icon simply makes that row (and the container it scrolls in) wider
when needed, exactly like any other content already does there; no grid/layout restructuring is
needed to satisfy FR-003.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (existing app code — no new dependency)

**Primary Dependencies**: None new.

**Storage**: N/A.

**Testing**: Vitest + `@testing-library/react` (existing setup) — assert the rendered `width`/
`height`/`size` values at each of the four call sites.

**Target Platform**: Web (existing PWA).

**Project Type**: Single-page web app (existing `src/` structure).

**Performance Goals**: N/A — no new assets, no new requests; this only changes how large an
already-loaded image renders.

**Constraints**: FR-002 — the Today card's icon must stay the largest of the four after scaling;
FR-003 — no layout regression outside the timeline's own existing horizontal scroll.

**Scale/Scope**: Four small, independent edits (one per placement) plus their CSS, if any
supporting layout rule needs a matching adjustment (e.g. `.today-summary-character`'s size, which
is keyed to the weather icon's own size today per its own CSS comment).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no gates apply. PASS.

## Project Structure

### Documentation (this feature)

```text
specs/065-larger-weather-icons/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output (trivial — no data model; still produced per template)
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not created by /speckit-plan)
```

No `contracts/` directory — purely a display-size/CSS change.

### Source Code (repository root)

```text
src/components/TodaySummaryCard.tsx      # MODIFIED: icon width/height/size 40 -> 64 (research.md §1)
src/components/WeatherIconOverview.tsx   # MODIFIED: hourly timeline icon width/height/size 28 -> 44
src/components/ObservationDetails.tsx    # MODIFIED: Details table icon width/height/size 28 -> 44
src/components/WeeklyForecastStrip.tsx   # MODIFIED: 7-day strip icon width/height/size 28 -> 44
src/index.css                            # MODIFIED (if needed): any CSS keyed to the old pixel
                                          # sizes (e.g. `.today-summary-character`'s own sizing,
                                          # which is set relative to the weather icon today)

tests/integration/weatherIconOverview.test.tsx  # MODIFIED: assert the new width/height/size at
                                          # each of the four placements
```

**Structure Decision**: No new files — a targeted prop-value change at four already-identified
call sites (research.md §1 has the exact current/new numbers), matching the spec's own framing of
this as a small, well-bounded follow-up to 063-replace-weather-icons.

## Complexity Tracking

*No constitution violations — section not applicable.*
