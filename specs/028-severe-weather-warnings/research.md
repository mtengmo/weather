# Research: Severe Weather Warnings

## §1 — Data source and shape

**Decision**: Use SMHI's Impact-Based Weather Warnings (IBWW) API,
`https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json` — the full national
list of currently-published warnings. A live sample request confirmed the shape: each entry has
`id`, a bilingual `event` (`{sv, en, code}`), one or more `warningAreas` (each with `areaName`,
`warningLevel` as `{sv, en, code}`, `approximateStart`, `published`), bilingual `descriptions`
(titled sections, e.g. "Händelsebeskrivning"/incident description and "Vad ska jag tänka på?"/
what to consider), an `area` GeoJSON `Feature` (confirmed `Polygon` geometry, `[lon, lat]`
coordinate order, standard GeoJSON), and `affectedAreas` (county identifiers).

**Rationale**: This is the exact endpoint the user supplied, is the authoritative, official
source for Swedish weather warnings, and already carries everything the spec's functional
requirements need (severity, title, description, validity, area) in one response — no second
lookup required.

**Alternatives considered**:
- A per-point warnings query (if SMHI offered one) — none was found in the sampled API surface;
the feed is a full national list, filtered client-side (§3 below).

## §2 — No explicit end time on individual `warningAreas`

**Observation**: The sampled entry carries `approximateStart` (a start time) and `published`
(publication timestamp) on each `warningAreas` entry, but no explicit `approximateEnd` was
visible in the one sampled (currently-active, ongoing) warning.

**Decision**: Treat a warning as "currently active" (FR-006) when `approximateStart` is at or
before now, and the warning is still present in the live feed at all — the feed itself is the
source of truth for "is this still in effect," since SMHI removes/updates entries as warnings are
downgraded, extended, or cancelled (matching the spec's own Edge Cases: "the next time that
location's weather is loaded/refreshed, the banner reflects the current state"). If a future
sample reveals an explicit end-time field on a given entry, it is used as an additional filter
(a warning past its own stated end is excluded even if still momentarily present in the feed) —
implemented defensively (`endTime == null || endTime > now`) so its absence never breaks
filtering.

**Rationale**: Matches the spec's Edge Cases section exactly ("no separate real-time push is
expected... the next load reflects current state") without depending on a field whose presence
wasn't confirmed in the one live sample taken during specification.

## §3 — Matching a location to a warning: point-in-polygon

**Decision**: Implement a small, dependency-free point-in-polygon check (`src/services/geo.ts`)
using the standard ray-casting algorithm, supporting both GeoJSON `Polygon` and `MultiPolygon`
geometries (a `MultiPolygon` is plausible for a warning covering, e.g., an archipelago county,
even though the one sampled entry was a simple `Polygon`). A location is "covered" by a warning
when the point falls inside (or on the boundary of) any ring of the warning's `area` geometry.

**Rationale**: The warning's own boundary is the authoritative, most-precise definition of its
affected area (more precise than a county-name lookup, which the app has no existing
reverse-geocoding capability to produce from raw lat/lon anyway) — and ray-casting against a
polygon with a few dozen vertices is a well-understood, cheap, ~20-line algorithm, consistent
with this codebase's existing willingness to hand-roll small geometry math client-side
(`haversineKm` in `smhiProvider.ts` is the precedent).

**Alternatives considered**:
- Matching via `affectedAreas`' county identifiers against a hardcoded lat/lon→county lookup
table — rejected: requires either a new reverse-geocoding data set (a non-trivial addition) or
a hand-maintained table of Swedish county boundaries, which is strictly more data and more
maintenance than reusing the polygon SMHI already publishes per-warning.
- A bounding-box-only check (cheaper, less precise) — rejected: a location just outside a
warning's true shape but inside its bounding box would incorrectly show a warning, undermining
FR-002's "show it accurately" intent; the full ray-cast is cheap enough (dozens of warnings,
each a small polygon, once per location load) that the precision is worth it.

## §4 — Severity ordering

**Decision**: SMHI's own warning-level `code` values (`MESSAGE` confirmed in the live sample;
the wider Swedish public warning scale is documented elsewhere by SMHI as "Meddelande" →
"Klass 1" → "Klass 2" → "Klass 3", informational through highest-impact) are mapped to a fixed
ordinal ranking maintained as a small lookup table in code. An unrecognized/future `code` value
sorts below every recognized one (defensive default — never crashes, never wrongly promoted to
"most severe").

**Rationale**: The feed's own `code` field is a small, stable enum-like identifier (already
used as a discriminator elsewhere in the payload, e.g. `event.code`) — a lookup table is the
simplest way to express "SMHI's official ordering" without inventing a new scale, matching the
spec Assumption ("SMHI's own published warning-level scale... is used as-is").

## §5 — Fetch orchestration and coverage gating

**Decision**: Same pattern as `027-uv-index-alert`'s UV-risk fetch: `useObservationData` gets its
own independent `useEffect`, gated first by `smhiProvider.isCovered` (skip the fetch entirely,
resolve to `[]`, for non-Swedish locations — FR-007), then a try/catch around the full-list fetch
that degrades to `[]` on any failure (FR-008), then the point-in-polygon + validity-window filter
(§2, §3) applied client-side, then severity sort (§4).

**Rationale**: Reuses the exact orchestration convention this session already established for
027, keeping every SMHI-only "extra" data source in the app structurally identical (independent
effect, coverage-gated, non-throwing) rather than each inventing its own shape.
