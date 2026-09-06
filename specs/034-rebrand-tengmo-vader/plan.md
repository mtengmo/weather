# Implementation Plan: Rebrand to Tengmo Väder

**Branch**: `034-rebrand-tengmo-vader` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/034-rebrand-tengmo-vader/spec.md`

## Summary

Renames the app from "Weather History" to "Tengmo Väder" across the page title, footer, and PWA
manifest; regenerates the favicon/PWA icon set from the new translucent logo
(`docs/logos/tengmovader_icon_transluent.png`, already present from a prior branding pass that
produced `tengmovader_icon.png`); and switches the GitHub Pages custom domain from
`weather.tengmo.com` to `vader.tengmo.com` via `public/CNAME`, updating the one other in-repo
reference to the old domain (the reverse-geocoding user-agent string).

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3, Vite 5

**Primary Dependencies**: `vite-plugin-pwa` (manifest `name`/`short_name`/icons config, already in
use — no new dependency); icon regeneration uses `sharp`, already installed in this session's
scratchpad `imgtools/` helper from the prior icon-generation pass, run as a one-off local script
(not a project dependency, since `public/*.png` are committed static assets, not build-time
generated)

**Storage**: N/A — static text/config changes and static image assets

**Testing**: Existing Vitest integration tests asserting footer/title text
(`tests/integration/footer.test.tsx`, `tests/integration/appHeader.test.tsx`) updated to expect
"Tengmo Väder" instead of "Weather History"

**Target Platform**: Static SPA, GitHub Pages, now served from `vader.tengmo.com`

**Project Type**: Single front-end web app (existing `src/`/`tests/`/`public/` structure)

**Performance Goals**: N/A — no runtime behavior change

**Constraints**: `public/*.png` icon files are pre-generated, committed binaries (not built from
source at build time), so regenerating them is a one-off local step whose *output* is committed,
mirroring how the current icon set was produced (`tengmovader_icon.png` → current `public/*.png`
via the scratchpad `imgtools/resize.mjs` script). GitHub Pages serves exactly one custom domain
from `public/CNAME`; no redirect from the old domain is being configured (spec Assumptions).

**Scale/Scope**: `index.html` (title), `vite.config.ts` (PWA manifest name/short_name),
`src/components/Footer.tsx` (footer text), `public/CNAME` (domain), `public/*.png` (regenerated
icon set — 5 files), `src/services/geocoding.ts` (user-agent string), `README.md` (heading), plus
the two integration tests that assert the old name.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond this
repo's own established conventions (reuse the existing PWA-icon file set/sizes rather than
inventing new ones; keep the domain change confined to `public/CNAME` and the one runtime
reference that embeds it). No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/034-rebrand-tengmo-vader/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md              # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
index.html                        # <title> "Weather History" -> "Tengmo Väder"
vite.config.ts                    # PWA manifest name/short_name
src/components/Footer.tsx         # footer "Weather History v..." -> "Tengmo Väder v..."
src/services/geocoding.ts         # user-agent string domain reference
public/CNAME                      # weather.tengmo.com -> vader.tengmo.com
public/favicon-16.png             # regenerated from tengmovader_icon_transluent.png
public/favicon-32.png             # regenerated
public/apple-touch-icon.png       # regenerated
public/icon-192.png               # regenerated
public/icon-512.png               # regenerated
README.md                         # heading "Weather History" -> "Tengmo Väder"

tests/integration/footer.test.tsx     # expect "Tengmo Väder v"
tests/integration/appHeader.test.tsx  # no standalone "Tengmo Väder" heading (mirrors old assertion)
```

**Structure Decision**: No new files or components — purely text/config/asset substitution across
the existing structure.

## Complexity Tracking

*No constitution violations — section not needed.*
