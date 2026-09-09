# Implementation Plan: Sticky Observed/Forecast Timeline Label, No Per-Column Repeat

**Branch**: `053-make-timeline-observed` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/053-make-timeline-observed/spec.md`

## Summary

Remove the per-column `<span className="weather-timeline-cell-forecast">Forecast</span>` (redundant — the existing `.weather-timeline-sections` band above the columns already labels the same thing, and each cell's own `aria-label` already discloses "(forecast)" for assistive tech, so nothing accessibility-relevant is lost). Make that existing band `position: sticky; top: 0` so it stays visible while the viewer scrolls down through the timeline's other rows (temperature graph, rain, wind), rather than scrolling away with them.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18 / CSS

**Constraints**: No app-level fixed/sticky header exists to coordinate an offset with (confirmed by reading `index.css`) — `top: 0` is sufficient; a prior feature (039-rain-percent-sticky-fix) removed a *horizontally*-sticky column after mobile complaints about it eating into chart width — this is a different axis (vertical sticky while scrolling the page down) and doesn't consume horizontal space, so that precedent doesn't apply here.

**Scale/Scope**: Remove one JSX span + its now-unused CSS rule; add `position: sticky` (+ background, so underlying content doesn't show through) to one existing CSS rule.

## Project Structure

```text
src/components/WeatherIconOverview.tsx   # remove per-cell Forecast span
src/index.css                            # remove .weather-timeline-cell-forecast; add sticky to .weather-timeline-sections
tests/integration/weatherIconOverview.test.tsx  # assert no per-cell tag; band still present
```
