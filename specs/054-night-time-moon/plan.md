# Implementation Plan: Night-Time Moon Variants for Sun-Depicting Icons

**Branch**: `054-night-time-moon` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/054-night-time-moon/spec.md`

## Summary

Crop 4 night-variant icons from the user-supplied `docs/logos/symbols_night_ver1.png` (real alpha transparency, 2×2 grid — a first for this project's icon sheets) and add them as a small `NIGHT_VARIANT_ICONS` overlay map alongside the existing `SMHI_SYMBOL_ICONS`, consulted only for codes 1-4 and only when the period's own timestamp falls in the app's existing night-hour rule (reused from `weatherCondition.ts`, exported rather than duplicated).

## Technical Context

**Language/Version**: TypeScript 5.5, React 18; Python 3 + Pillow for the one-off extraction

**Constraints**: `SMHI_SYMBOL_ICONS`'s existing 27-entry shape must not change; codes 5-27 and the fallback (non-SMHI) path must be unaffected

**Scale/Scope**: 4 new image assets, 1 new small map, 1 exported helper, resolver signature extension (1 new defaulted parameter), 1 call-site update

## Project Structure

```text
docs/logos/
├── symbols_night_ver1.png              # source (already supplied)
└── symbols_night_ver1_icons/           # 4 cropped night icons (source of truth)

src/assets/weather-icons/
└── 01-clear-night.png, 02-nearly-clear-night.png, 03-variable-cloudiness-night.png, 04-halfclear-night.png  (new files)

src/services/weatherCondition.ts   # export isNight
src/components/smhiSymbolIcons.ts  # NIGHT_VARIANT_ICONS + resolveFromParts/resolvers
src/components/WeatherIconOverview.tsx  # pass isNight(period.key) to resolveConditionIconFromCondition
```
