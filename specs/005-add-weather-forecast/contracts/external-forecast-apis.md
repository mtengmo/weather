# Contract: External forecast APIs consumed

These are third-party contracts the app depends on but does not control — recorded here so implementation tasks verify against the live services rather than against this document, which captures decisions and known-risk points, not a frozen wire spec.

## SMHI point forecast (primary)

- **Endpoint**: `GET https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/{lon}/lat/{lat}/data.json` (research.md §1 — supersedes the deprecated `pmp3g/version/2` endpoint some older references/tutorials still cite).
- **Coverage gating**: Reuse the existing `isCovered` (observation-station-distance-based) check already in `smhiProvider.ts`; do not assume forecast coverage matches observation coverage without verifying — if SMHI's forecast grid has different effective coverage than its station network, `getObservations` must still degrade per the "New failure mode" in `weather-api-facade.md`, not throw.
- **Shape risk**: Flat, human-readable parameter object (not the old nested `parameters[]` array) — must be verified against a live response before implementation locks in exact field names (research.md §1 risk note).
- **Precipitation quirk**: Reporting interval widens later in the forecast horizon (research.md §2) — irrelevant at the 24h/7d horizons this feature needs, but do not copy this endpoint's raw precipitation values into an hourly chart bucket without confirming which interval a given value represents, if this feature's scope ever grows past 7 days.
- **Horizon**: ~10 days — comfortably covers this feature's 7-day requirement.

## Open-Meteo forecast (fallback)

- **Endpoint**: Same `GET https://api.open-meteo.com/v1/forecast` the app already calls for history (`openMeteoProvider.ts`) — no new endpoint.
- **Change**: `forecast_days` parameter raised from its current `1` to `8`; remove the post-fetch trim that currently discards every row at/after `Date.now()` (research.md §3).
- **Shape**: Already fully understood by the existing code (`OpenMeteoHourlyResponse` interface in `openMeteoProvider.ts`) — no new parsing risk, since forecast rows arrive in the exact same `hourly.*` arrays as historical rows in one response.
