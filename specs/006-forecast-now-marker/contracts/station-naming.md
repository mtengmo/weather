# Contract: `src/hooks/useGeolocation.ts` naming — extended (internal)

Extends 005's contract for this hook. `useGeolocation`'s return shape (`{ location, status, request }`) is unchanged — this is a behavior change in what `location.displayName` ends up holding, not a shape change.

## Extended behavior

005 already resolves `displayName` for a current-position `Location` via a nearest-station lookup, falling back to the literal `"Unnamed station"` when that lookup finds no usable name. This feature inserts one more attempt between "lookup found nothing" and "give up with the literal fallback text":

1. Station-name lookup (005) runs first, unchanged.
2. If it produces `"Unnamed station"`, attempt `geocoding.ts`'s reverse-geocode lookup (see `geocoding.md`) using the same coordinates.
3. If that succeeds, use its result as `displayName` instead — presented as approximate (FR-009; exact wording is a `/speckit-tasks` decision, e.g. a "near " prefix or a distinct label style).
4. If it also fails/returns `null`, `displayName` stays `"Unnamed station"` (FR-010) — unchanged from 005's existing behavior.

**Non-blocking** (spec Edge Cases): this attempt must not delay `status` reaching `"granted"` or block the rest of the page from becoming usable — consistent with how 005's own station-name resolution is already applied asynchronously after `status` is set, not before.

**Unchanged**: favorite and searched locations set their own `displayName` directly and never go through this hook at all (005) — this feature doesn't touch that path, matching spec Assumptions.
