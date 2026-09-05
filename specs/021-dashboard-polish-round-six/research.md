# Research: Dashboard Polish Round Six

## §1 — SMHI's real forecast-issued timestamp (US1 / FR-001, FR-002)

**Decision (confirmed root cause via a live API call)**: `smhiProvider.ts`'s `SmhiForecastResponse`
interface parses `data.approvedTime` — a field that **does not exist** in SMHI's actual
point-forecast API response. A live fetch of
`opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/18.06/lat/59.33/data.json`
returns a top-level shape of:

```json
{ "createdTime": "2026-09-05T16:44:05Z", "referenceTime": "2026-09-05T16:30:00Z", "geometry": {...}, "timeSeries": [...] }
```

`approvedTime` is simply absent, so `data.approvedTime ?? null` has **always** evaluated to
`null` in production since 019 introduced it — `forecastIssuedAt` has never once carried SMHI's
real time; the footer's freshness time has silently been the app's own fetch time on every load,
exactly matching the user's report ("I don't see it" — because it was never really SMHI's time to
begin with).

**Fix**: Parse `referenceTime` instead of `approvedTime` — SMHI's own documentation describes
`referenceTime` as the forecast model run's reference time, the closest match to "when this
forecast was created," and the same concept SMHI's own app/site surfaces. (`createdTime` is a
close second choice — when this specific API response was generated — but `referenceTime` is the
more meaningful "forecast issued at" semantic and the one that stays stable across repeated
fetches of the same underlying model run, unlike `createdTime`.)

**Rationale**: A one-field-name fix restores the entire freshness feature 019/020 already built
the plumbing for — `forecastIssuedAt` threading through `ObservationSeries` and
`MultiSourceForecastEntry`, and the footer's fallback-to-`lastUpdated` logic, are all already
correct and need no further change.

**Alternatives considered**: `createdTime` — rejected as the primary choice since it reflects
this API call's own response-generation time rather than the forecast model run itself, but
worth keeping in mind as a fallback if `referenceTime` is ever absent (see data-model.md).

## §2 — Making cross-source averaging visible (US2 / FR-003)

**Decision (confirmed via live testing)**: The per-period `(avg)` marker on the temperature row
(implemented in 020) *is* rendering correctly today — a live check found 24 occurrences on the
24-hour view and 7 on the 7-day view for a real location. The gap is specifically the **footer**:
020's reworded `dataSourceDisclosure` only names the *observation* source ("SMHI observations · Forecast
updated HH:MM") with no mention that the forecast itself blends two providers — confirmed live
(`SMHI observations · Forecast updated 19:06`, no second source named anywhere). A user who
checks the footer — the natural, persistent place to check "what data is this" — finds no
confirmation of blending at all, even though the timeline's own `(avg)` tags are working.

**Fix**: Extend the footer's disclosure text to also name both forecast sources when the forecast
genuinely blends them, e.g. `SMHI observations · SMHI + Open-Meteo forecast, updated HH:MM` —
sourced from `multiSourceForecast.length > 1` (already available wherever `dataSourceDisclosure`
is called from `Footer.tsx`, via `App.tsx`'s existing `multiSourceForecast` state) rather than
adding new data-fetching.

**Rationale**: Directly satisfies FR-003's "footer... confirmation is present and easy to find"
without touching the already-correct per-period `(avg)` marker.

**Alternatives considered**: Extending averaging to the Rain/Wind rows too, so `(avg)` appears
more broadly — out of scope; the spec's own Assumptions section keeps this round's blending
indicator to "the value itself," which is already temperature-only by design (016/019's own
research), not a defect to fix here.

## §3 — Rain-bar baseline misalignment (US3 / FR-004, FR-005)

**Decision (confirmed root cause via code review)**: `.weather-timeline-bar-cell` is a flex
column with `justify-content: flex-end` — the whole stack of children (bar, value text, and,
when present, the chance-of-rain percentage) is bottom-anchored as a group within the row's fixed
70px height. A period with a chance-of-rain percentage stacks *three* children
(bar + value + chance); a period without one stacks only *two* (bar + value). Since the whole
group is packed to the bottom as a unit, the extra text height in a 3-child cell pushes that
cell's *bar* upward relative to a neighboring 2-child cell's bar — the two bars' bottoms no
longer align, even though both represent "0" on the same scale.

**Fix**: Move the chance-of-rain percentage from its own stacked line below the value text to an
inline suffix on the *same* line as the value (e.g. `2.0 mm · 60%`), so every cell always stacks
exactly two children (bar + one text line) regardless of whether a chance-of-rain value is
present — baselines stay aligned by construction rather than by coincidence.

**Rationale**: Matches FR-004/FR-005 exactly and removes the *cause* of the misalignment (a
variable number of stacked children) rather than compensating for it with a fixed-height
placeholder, which would be more fragile against future row changes.

**Alternatives considered**: Reserving a fixed-height placeholder line for the chance-of-rain
slot even when absent (so every cell always has 3 children) — rejected as a larger visual/spacing
change (adds empty vertical space to every rain column, not just the ones that need it) for the
same outcome the inline-suffix approach achieves more simply.

## §4 — Location panel contrast (US4 / FR-006)

**Decision (confirmed via live screenshot)**: `.location-panel-content` already has both a
`border: 1px solid var(--border)` and a `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25)` — but in the
default "midnight" theme, `--border` (`#2e323d`) is barely lighter than `--surface` (`#1c1f27`)
and `--bg` (`#12141a`), and a *black* drop-shadow provides no contrast boost against an
already-near-black page background. A live screenshot of the open panel confirms the edge is
genuinely difficult to distinguish from the page behind it.

**Fix**: Add a second, light-toned shadow layer specifically for edge definition — e.g.
`box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08)` — a subtle
light "ring" that reads clearly against a dark background regardless of how close `--border` and
`--surface` sit to each other, while the existing dark drop-shadow layer continues to provide
elevation cues on lighter themes. Applied to `.location-panel-content` and, for consistency (same
pattern, same risk), `.display-menu-content`.

**Rationale**: A light-ring layer is a well-established technique for floating panels on dark
backgrounds and requires no new theme-specific variables or per-theme overrides — it works
identically (subtly) across all three themes.

## §5 — Icon-size consistency (US5 / FR-007)

**Decision (confirmed via code review)**: `WeeklyForecastStrip.tsx` renders its day icons at
`size={24}`; `ConditionRow` (the main timeline's condition icons, in `WeatherIconOverview.tsx`)
renders at `size={28}` — both already use the same `WEATHER_ICONS` set (confirmed: every
component that shows a condition icon — `ConditionRow`, `TodaySummaryCard`, `WeeklyForecastStrip`,
`ObservationDetails`' new Condition column — imports from the same `./weatherIcons` module), so
the glyphs themselves are already identical; only the rendered size differs.

**Fix**: Change `WeeklyForecastStrip.tsx`'s icon size from `24` to `28`, matching `ConditionRow`.

**Rationale**: The smallest possible change that satisfies FR-007 — no icon-set change needed,
since the underlying icons were never actually different.

## §6 — Version bump (US6 / FR-008)

**Decision**: Bump `package.json`'s `version` field (patch bump: `0.1.0` → `0.1.1`) as part of
this round's implementation, before the final commit. `src/services/appVersion.ts`'s existing
`APP_VERSION` (package.json version + short git commit hash, injected via `vite.config.ts`)
needs no code change — only the `package.json` value itself changes.

**Rationale**: The commit-hash suffix already changes every deploy, but the semantic version had
stayed frozen at `0.1.0` across rounds 018-020, which is what the user is reacting to. Going
forward, this is now a standing practice (saved as a persistent session memory,
`feedback_bump_version_per_implement.md`) applied at the end of every future
`/speckit-implement`, not something that needs its own task in future rounds' spec/plan/tasks —
FR-008's "and MUST continue to advance with each subsequent implementation round" is satisfied by
that standing practice rather than by app code.
