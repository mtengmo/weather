# Implementation Plan: Remove Dismiss Capability From the Warning Banner

**Branch**: `057-remove-dismiss-capability` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/057-remove-dismiss-capability/spec.md`

## Summary

Remove `WarningBanner`'s two dismiss (×) buttons and its `onDismiss` prop; remove `App.tsx`'s use of `useWarningDismissal` (both the `dismissedIds` filter and the `dismiss` callback passed down); delete the now-fully-unused `useWarningDismissal` hook and `warningDismissal` storage service, along with their tests. The Today card's informational-notice component (`TodaySummaryCard`) is untouched — it never had a dismiss control.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18

**Constraints**: Must not touch `TodaySummaryCard`'s collapse/expand behavior (048/052); must not attempt to clear any previously-written localStorage dismissal data (spec Assumptions — leave it inert, don't migrate)

**Scale/Scope**: Remove 2 files (`useWarningDismissal.ts`, `warningDismissal.ts`) + their tests, trim `WarningBanner.tsx` and `App.tsx`

## Project Structure

```text
src/components/WarningBanner.tsx    # remove onDismiss prop + both dismiss buttons
src/App.tsx                          # remove useWarningDismissal usage
src/hooks/useWarningDismissal.ts     # deleted
src/services/warningDismissal.ts     # deleted
tests/unit/useWarningDismissal.test.ts  # deleted
tests/integration/warningBanner.test.tsx  # remove/update dismiss-related tests
```
