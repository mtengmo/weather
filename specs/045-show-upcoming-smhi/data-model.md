# Data Model: Show Upcoming Weather Warnings

## WeatherWarning (extended)

Existing entity (`src/models/types.ts`), extended with one field.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unchanged. |
| `severityCode` | `string` | Unchanged. |
| `severityLabel` | `string` | Unchanged. |
| `title` | `string` | Unchanged. |
| `areaName` | `string` | Unchanged. |
| `description` | `string` | Unchanged. |
| `validFrom` | `string` (ISO 8601) | Unchanged — now may be in the future (up to 48h ahead) rather than always `<= now`. |
| `validUntil` | `string \| null` | Unchanged. |
| `isActive` | `boolean` | **New.** `true` when `validFrom <= now` (and not yet ended) — i.e. today's existing "active" condition. `false` means upcoming (`now < validFrom <= now + 48h`, the only other case that reaches this object, per the widened filter). |

No other entities change. `RawSmhiWarning`/`SmhiWarningArea` (raw feed shape in `smhiProvider.ts`) are unchanged — only how `getWarningsForLocation` filters and maps them changes.

## Validation / derivation rules

- A warning reaches the returned list only if: not yet ended (`validUntil === null || validUntil > now`), and starts no more than 48 hours from now (`validFrom <= now + 48h`). This replaces today's single `validFrom > now → exclude` rule with a bounded window instead of an unbounded past-only rule.
- `isActive` is computed once per warning at fetch time: `validFrom <= now`.
- Sort order: `isActive` descending (active before upcoming), then `severityRank(severityCode)` descending, matching existing severity ordering within each group.

## State transitions

A given warning id can move from *not shown* → *upcoming* (`isActive: false`) → *active* (`isActive: true`) → *not shown* (expired or withdrawn) across successive fetches, as real time passes and SMHI updates the feed. No client-side state machine is needed — each fetch recomputes `isActive`/inclusion fresh from the current feed and current time, consistent with today's stateless refetch-and-recompute pattern. Dismissal (`useWarningDismissal`) is keyed by `id` and is unaffected by this transition, per spec's edge case (a dismissal made while upcoming continues to apply once active).
