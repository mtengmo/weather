# Research: Split Informational SMHI Warnings Into the Daily Brief

## 1. Distinguishing informational from color-coded warnings

**Decision**: `isInformational = severityCode === "MESSAGE"`. SMHI's own severity codes are `MESSAGE`, `CLASS_1`, `CLASS_2`, `CLASS_3` — `MESSAGE` is documented as their lowest, non-color-coded advisory tier; `CLASS_1/2/3` map to Yellow/Orange/Red. This is already the exact distinction `severityRank`/`SEVERITY_ORDER` in `weatherApi.ts` encodes for sorting, just not yet exposed as its own flag.

**Rationale**: No new data is needed — the raw feed already carries this code per warning area (`weatherApi.ts`'s existing mapping, confirmed live against SMHI's Uppsala water-shortage warning: `warningLevel.code === "MESSAGE"`).

**Alternatives considered**: Inferring "informational" from having no end date (`validUntil === null`) — rejected: a color-coded warning can also have no stated end date, and a Message-level one is not guaranteed to lack one; the severity code is the actual, documented signal.

## 2. Where to compute the split

**Decision**: Add `isInformational: boolean` onto each `WeatherWarning` inside `getWarningsForLocation` (same place `isActive` was added in 045), then split the single returned array into two at its one consumer, `App.tsx`.

**Rationale**: Keeps `getWarningsForLocation` the single source of truth for warning shape/classification (data layer), while `App.tsx` — which already owns both `warnings` and `dismissedIds` — is the natural place to route each kind to its own destination (banner vs. Today card), mirroring how it already filters dismissed ids before passing to `WarningBanner`.

**Alternatives considered**: Two separate service calls/arrays from `getWarningsForLocation` itself — rejected as an unnecessary API-shape change; a single array with a flag is simpler and keeps every existing consumer/test that reads the full list working unless they need to.

## 3. Where informational warnings render

**Decision**: Inside the existing `TodaySummaryCard`, as a new small block (icon-free, one line per informational warning, no expand/collapse), threaded down from `App.tsx` through `WeatherIconOverview`'s existing prop-passing pattern.

**Rationale**: `TodaySummaryCard` already is the "everyday brief for today" surface (high/low, rain, wind, sunrise/sunset, moon) — spec's own Assumption. No new component needed; matches existing patterns (`today` is `null`-checked and returns `null` early — the new content follows the same "render nothing if nothing to show" convention `WarningBanner` itself already documents).

**Alternatives considered**: A new standalone component — rejected as unnecessary; a few informational lines don't warrant a new file when an existing, purpose-matched card already exists.

## 4. Dismissal

**Decision**: Informational warnings shown in the Today card are not wired into `useWarningDismissal` at all — no dismiss button, no id tracking for them.

**Rationale**: Directly resolves spec's FR-005 and the original user confusion (dismissing a banner warning shouldn't be able to hide anything else, and now there's nothing dismissible to worry about for this kind). `useWarningDismissal`'s existing per-id persistence continues to apply only to `WarningBanner`'s (color-coded) warnings, unchanged.

## 5. Non-SMHI providers

**Decision**: No change — `getWarningsForLocation` already only ever returns SMHI-sourced warnings (it's the sole caller of `smhiProvider.getActiveWarnings`), so this split naturally applies to SMHI warnings only, matching spec's Assumptions.
