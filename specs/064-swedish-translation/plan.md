# Implementation Plan: Swedish Translation Based On Browser Language

**Branch**: `064-swedish-translation` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/064-swedish-translation/spec.md`

## Summary

The app has zero i18n infrastructure today — confirmed by direct inspection: no library, no
locale files, ~100-150+ user-facing English strings hardcoded directly in JSX/TS across roughly
22 component files plus a couple of service modules. This plan introduces `i18next` +
`react-i18next` (the standard, well-tested React i18n pair — chosen over a hand-rolled solution
because this app already has enough string volume and interpolation needs, e.g. "High {value}°",
to benefit from a real library rather than reinventing one), two flat translation-key resource
files (`en`, `sv`), and a small language-detection step (based on `navigator.language`, no browser
detector plugin needed — the detection rule is a one-line check). Every hardcoded string across
every component is then replaced with a translation-key lookup.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (existing app code)

**Primary Dependencies**: NEW — `i18next`, `react-i18next` (both small, no transitive bloat,
industry-standard for React). No other new dependency; no browser-language-detector plugin needed
(the detection rule itself is trivial — see research.md §2).

**Storage**: N/A — the selected language is derived fresh from `navigator.language` on each load,
not persisted (spec.md doesn't ask for a manual override to remember, so there's nothing to
persist)

**Testing**: Vitest + `@testing-library/react` (existing setup) — translation resource
completeness (every key present in both `en` and `sv`) gets its own unit test; a handful of
component-level integration tests confirm Swedish renders when `navigator.language` is Swedish

**Target Platform**: Web (existing PWA)

**Project Type**: Single-page web app (existing `src/` structure)

**Performance Goals**: Both language resource files ship in the existing bundle (they're small —
a few hundred short strings, not a heavy asset) — no new network request, no lazy-loading
complexity needed at this scale

**Constraints**: FR-006 — number/date/time formatting must stay exactly as it is today; this
feature touches text content only, never `Intl`/`toLocale*` calls already in place

**Scale/Scope**: This is the largest-blast-radius change in the app's history so far — every one
of ~22 component files (plus `src/services/format.ts`, which returns a few hardcoded English
sentences) has at least one string to extract. Planned as an incremental, file-by-file migration
(each file independently testable/reviewable) rather than one giant rewrite.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no gates apply. PASS.

## Project Structure

### Documentation (this feature)

```text
specs/064-swedish-translation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not created by /speckit-plan)
```

No `contracts/` directory — internal-only change, no new external interface.

### Source Code (repository root)

```text
src/i18n/
├── index.ts              # NEW: i18next.init(), language detection (research.md §2)
├── en.ts                 # NEW: English translation resource (today's exact existing copy,
│                          # extracted verbatim — the baseline every key is checked against)
└── sv.ts                 # NEW: Swedish translation resource (same keys as en.ts)

src/main.tsx               # MODIFIED: import "./i18n" before rendering <App />

src/components/*.tsx       # MODIFIED (all ~22 files): every hardcoded string replaced with a
                            # `useTranslation()` + `t("key")` call
src/services/format.ts     # MODIFIED: the handful of hardcoded sentences it returns become
                            # translation-key lookups too (needs access to `t`, threaded in or
                            # imported directly — see research.md §4)

tests/unit/i18n.test.ts    # NEW: every key in en.ts has a matching key in sv.ts and vice versa
                            # (and neither has an empty-string value) — the single guard that
                            # prevents the two resource files drifting out of sync as new strings
                            # are added in the future
tests/integration/*.test.tsx  # MODIFIED (representative subset): a handful of existing tests
                            # updated/added to assert Swedish text renders when the mocked browser
                            # language is Swedish
```

**Structure Decision**: A dedicated `src/i18n/` module keeps the two resource files and the setup
call together and easy to find, matching this app's existing convention of grouping a concern's
files under one clearly-named directory (e.g. `src/services/`).

## Complexity Tracking

*No constitution violations — section not applicable.*
