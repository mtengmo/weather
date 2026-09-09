# Research: Show Upcoming Weather Warnings

## 1. How to determine "active" vs. "upcoming" without a new data source

**Decision**: Derive both from data already present on each `RawSmhiWarning`'s `warningAreas[].approximateStart`/`approximateEnd` — exactly the fields `getWarningsForLocation` already parses. A warning is:
- **Active**: `validFrom <= now && (validUntil === null || validUntil > now)` (today's existing condition).
- **Upcoming**: `now < validFrom <= now + 48h`.
- **Excluded**: everything else (too far out, or already ended).

**Rationale**: The SMHI feed already carries publish-ahead warnings with a future `approximateStart` — that's precisely what today's code filters out with `if (validFrom > now) continue;`. No new endpoint or field is needed; only the filter boundary and what gets attached to the returned object change.

**Alternatives considered**:
- *Fetch a separate "forecast warnings" feed*: SMHI's IBWW feed doesn't distinguish endpoints by active/upcoming — it's one list of currently-published warnings, active or not. Rejected as unnecessary.
- *Unbounded upcoming window (show anything published, however far out)*: rejected per spec's edge case — could surface warnings days away, cluttering the banner with things not yet actionable. 48h matches the user's own "will it arrive tomorrow" framing and is a defensible, easily explained default.

## 2. Where to compute the active/upcoming split

**Decision**: Inside `getWarningsForLocation` (`weatherApi.ts`), alongside the existing filter/map loop — add an `isActive: boolean` field to each returned `WeatherWarning`, computed once, rather than re-deriving active/upcoming status in the component from raw timestamps.

**Rationale**: Keeps `WarningBanner` a pure rendering component (existing pattern — it already just reads `severityCode`, `title`, etc. off the warning object without doing its own date math). Matches 028's original split of responsibility: data-layer computes/normalizes, UI-layer renders.

**Alternatives considered**: Compute `isActive` in the component from `validFrom`/`validUntil` at render time — rejected, since it would duplicate the "now" concept in two places and risk drift between the filter boundary and the display boundary.

## 3. Sorting upcoming warnings relative to active ones

**Decision**: Active warnings are listed first (as today), followed by upcoming warnings; within each group, sort by existing severity rank (`severityRank`, most severe first). This is a straightforward extension of today's single `sort` call: sort by `(isActive desc, severityRank desc)`.

**Rationale**: An active warning is more urgent by definition than any upcoming one, regardless of severity — a viewer should never see a merely-upcoming warning listed ahead of one already in effect. Matches spec's US2 acceptance scenario 2 (upcoming warnings ordered by severity among themselves).

**Alternatives considered**: Interleave everything by severity alone, ignoring active/upcoming — rejected; could show a low-severity upcoming warning ahead of a high-severity... no, severity is primary within group but active/upcoming is the primary group split. Rejected because it could visually suggest an upcoming warning is "worse" or more urgent than a currently active one of lower nominal severity, which would be misleading for a safety-relevant banner.

## 4. "Starts in X" label format

**Decision**: Compute a human-readable relative label (e.g. "starts in 3h", "starts tomorrow") from `validFrom` at render time in `WarningBanner`, using the same locale-aware formatting style already used for `validFrom`/`validUntil` display (`toLocaleString` with `dateStyle`/`timeStyle`). For upcoming warnings, show both the relative label and the absolute local start time (mirroring how active warnings already show their absolute validity window).

**Rationale**: Consistent with the existing component's date-formatting approach; no new dependency needed (no date library) since this is well within `Intl`/native `Date` capabilities and existing precedent in the file.

**Alternatives considered**: Pull in a relative-time library (e.g. `date-fns`) — rejected as unnecessary; `Intl.RelativeTimeFormat` or simple hour-bucket math suffices for a single label.

## 5. WeatherWarning model change

**Decision**: Add exactly one new field, `isActive: boolean`, to `WeatherWarning`. Do not add a separate `startsIn` string field — that's a presentation-time computation the component derives from the already-present `validFrom`, keeping the model minimal and avoiding a value that would go stale between fetch and render.

**Rationale**: Minimal model change; keeps "what to display" (a formatted relative string) as a rendering concern, not a data concern, consistent with how `validFrom`/`validUntil` are already stored as raw ISO strings and only formatted at render time today.
