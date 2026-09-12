# Phase 1 Data Model: Refresh the Woman Character's Icon Artwork (Sheets 1-6)

No new entities, fields, or naming conventions. This is a pure content replacement at 72 of the
124 existing paths already described by 063-replace-weather-icons' data-model.md
(`weather_{type}_{day|night}_{band}.png` under `src/assets/weather-icons-v2/`):

| Weather type | Bands | Rows | File count |
|---|---|---|---|
| `clear`, `nearly-clear`, `variable`, `cloudy`, `overcast`, `fog` | `frozen`, `cold`, `nearzero`, `mild`, `warm`, `hot` | `day`, `night` | 6 × 6 × 2 = 72 |

**Invariant**: The other 52 files (weather types `rain-light`, `rain-heavy`, `thunder`, `sleet`,
`snow-light`, `snow-heavy` × their respective bands × day/night, from source sheets 7-19) are
unaffected — not regenerated, not re-saved, not touched at all (FR-003/SC-002).
