# Implementation Plan: Humidity Level Indicator

**Branch**: `050-show-humidity-level` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/050-show-humidity-level/spec.md`

## Summary

`WeatherObservation.relativeHumidity` already exists and is already populated by MET Norway and Open-Meteo (used today only internally, for the "feels like" calculation) — SMHI just needs the same field wired up, from data it already returns but the app doesn't parse yet. Once populated, `TodaySummaryCard` gets one new line — a Dry/Normal/High level derived from the same "current reading" `WeatherIconOverview.tsx` already computes for `currentCondition`/`currentTemperature`.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18

**Primary Dependencies**: None new

**Storage**: N/A

**Testing**: Vitest + Testing Library

**Target Platform**: Web (existing PWA)

**Constraints**: No behavior change for MET Norway/Open-Meteo (already populate `relativeHumidity`); must not affect the Today card when no humidity reading exists (FR-004)

**Scale/Scope**: One new SMHI forecast field, one new SMHI observation parameter fetch, one small classification function, one new line in an existing card

## Constitution Check

Constitution file is an unfilled template — no gates apply.

## Project Structure

### Documentation (this feature)

```text
specs/050-show-humidity-level/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── services/smhiProvider.ts         # HUMIDITY_PARAM=6, relative_humidity forecast field, fetch + map into WeatherObservation
├── components/WeatherIconOverview.tsx  # currentHumidity from existing nearestObservation, passed to TodaySummaryCard
└── components/TodaySummaryCard.tsx  # humidityLevel() classification + new rendered line
```

**Structure Decision**: Single existing web app. No changes to MET Norway/Open-Meteo providers (already correct) or to any other component.
