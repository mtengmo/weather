# Data Model: Severe Weather Warnings

## New types (`src/models/types.ts`)

### `WeatherWarning`

The app's own reduced shape — built from the raw SMHI feed entry, keeping only what the UI
needs (never storing the raw GeoJSON geometry past the filtering step, which needs it once
per fetch and no longer).

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | SMHI's own warning id, for React list keys. |
| `severityCode` | `string` | SMHI's `warningLevel.code` (e.g. `"MESSAGE"`), used for the ordinal sort (research.md §4) and as a CSS hook for severity coloring. |
| `severityLabel` | `string` | SMHI's `warningLevel.en` — the human-readable severity, English. |
| `title` | `string` | SMHI's `event.en`. |
| `areaName` | `string` | SMHI's `warningAreas[].areaName` — shown in the expanded view so the user can see which named area the warning is officially issued for. |
| `description` | `string` | The concatenated/joined English `descriptions` sections (incident description + guidance), shown only in the expanded view. |
| `validFrom` | `string` (ISO) | From `approximateStart`. |
| `validUntil` | `string \| null` (ISO) | From an end-time field if the feed provides one for a given entry (research.md §2); `null` means "no stated end — still active per the feed's own presence." |

### `LocationWarnings` (hook/provider-layer return shape)

| Field | Type | Notes |
|---|---|---|
| `warnings` | `WeatherWarning[]` | Already filtered (covers this location, currently valid) and sorted most-to-least severe (FR-005). Empty array is the "no banner" case — the same value whether there's genuinely nothing active, the location is out of coverage, or the fetch failed (FR-007/FR-008 all collapse to this one empty-array case, matching `027-uv-index-alert`'s equivalent "empty Set = no badge" design). |

## Relationships

```
Location
   │
   ▼
smhiProvider.getActiveWarnings()  →  raw SMHI warning list (nationwide, GeoJSON areas)
   │
   ▼
weatherApi.getWarningsForLocation(location)
   │  1. isCovered(location) gate → [] if outside Sweden
   │  2. point-in-polygon filter (geo.ts) → keep only warnings whose area contains `location`
   │  3. validity-window filter → keep only currently-active warnings
   │  4. severity sort (most → least severe)
   ▼
WeatherWarning[]
   │
   ▼
useObservationData()  →  warnings: WeatherWarning[]  (own independent effect/state)
   │
   ▼
<WarningBanner warnings={...} />  →  collapsed: leading (most severe) warning's severity + title
                                      expanded: every warning, in the same sorted order
```

## Validation rules

- `warnings` is empty for: a location outside SMHI's coverage radius (FR-007), a fetch failure
(FR-008), and the genuinely-no-active-warning case — all three are indistinguishable to the UI
by design, since all three mean "show no banner."
- A `WeatherWarning` only ever appears in `warnings` when `validFrom <= now` and
(`validUntil == null || validUntil > now`) — never a future-scheduled or already-ended warning
(FR-006, Edge Cases).
- `warnings` is always sorted most-severe-first (FR-005) — the banner never needs to re-sort.
