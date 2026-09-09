# Implementation Plan: Fix "Now" Marker Hidden Behind the Sticky Timeline Band

**Branch**: `055-fix-now-marker` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/055-fix-now-marker/spec.md`

## Summary

Raise `.weather-timeline-now`'s `z-index` from `1` to above the sticky band's `2` (053), and give `.weather-timeline-now-label` its own explicit z-index too (its parent's `position: absolute` establishes a stacking context, but the label should not rely on implicit inheritance when the exact goal is "always on top of the sticky band"). One-line-per-rule CSS change, no JS/markup change.

## Technical Context

**Language/Version**: CSS only

**Constraints**: Must not change the sticky band's own stacking/visibility (053); must not change the "Now" line/label's positioning, only its stacking order

## Project Structure

```text
src/index.css   # .weather-timeline-now, .weather-timeline-now-label z-index
```
