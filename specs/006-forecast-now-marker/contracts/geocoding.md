# Contract: `src/services/geocoding.ts` (new, internal) + external Nominatim dependency

## Internal export

A single function, reverse-geocoding a coordinate to a place name:

- **Input**: `{ latitude: number; longitude: number }`.
- **Output**: `Promise<string | null>` — a short, human-readable place name on success, or `null` on any failure (network error, non-ok response, no usable address field in the response). Never throws — mirrors the "degrade to a falsy/empty result rather than throw" pattern already used by every other provider module in this app (`smhiProvider.ts`, `openMeteoProvider.ts`).

**Contract with callers**: `null` means "use the existing fallback text" (`useGeolocation.ts` keeps its 005 "Unnamed station" placeholder, per FR-010) — callers must not treat `null` as an error requiring special handling beyond that.

**Only caller**: `useGeolocation.ts`, only when the 005 station-name lookup already produced no usable name. Not called for favorites, searched places, or nearby comparison stations (spec Assumptions).

## External dependency: OpenStreetMap Nominatim (reverse geocoding)

- **Endpoint**: `GET https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=jsonv2` (research.md §6 — verified live during planning).
- **Required header**: a descriptive `User-Agent` (or `Referer`) identifying this app, per Nominatim's public-usage policy.
- **Response shape** (confirmed live): a JSON object with an `address` sub-object containing locality-level fields (`city`, `town`, `village`, `suburb`, `municipality`, `county`, etc., availability varies by location) plus a `display_name` full-address string. This service picks the most specific available populated-place field to build a concise name; exact field-preference order is a `/speckit-tasks`-level implementation detail.
- **Usage-policy compliance**: this feature's call pattern (once per unnamed-station resolution, not polled) stays well within the ~1 req/sec public-instance limit without needing explicit rate-limiting code (research.md §6).
- **Failure modes to treat as "no result" (→ `null`)**: network failure, non-2xx response, a response with no populated-place field in `address`, or a malformed/unparseable body.
