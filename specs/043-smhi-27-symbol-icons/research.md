# Phase 0 Research: 27 Distinct Icons for SMHI's Weather Symbol Codes

## 1. Preserving the raw SMHI symbol code through to icon selection

**Decision**: Add a new field to `WeatherObservation` (`src/models/types.ts`), e.g.
`smhiSymbolCode?: number | null` (1-27), populated only by `smhiProvider.ts`'s forecast path
(`forecastObservationForHour`, `src/services/smhiProvider.ts:317-334`) alongside the existing
`symbolCondition` field. `symbolCondition` (the collapsed `WeatherCondition`, already used by
`deriveWeatherCondition`'s guard/priority logic) is left untouched — this is a pure addition, not a
replacement.

**Rationale**: Today, `symbolCodeToCondition` (`smhiProvider.ts:127-136`) converts the raw
1-27 code straight into one of the existing 12 `WeatherCondition` buckets and discards the number
itself — that's the actual reason codes 9/19 ("moderate rain showers"/"moderate rain") and 10/20
("heavy" of the same) all currently render identically: they're folded into the same
`WeatherCondition` before icon lookup ever happens. Preserving the raw number is the minimal change
that makes 1:1 icon lookup possible, without touching the existing collapsed-condition logic that
the low-confidence rain guard and other rules still rely on (spec FR-006).

**Alternatives considered**: Expanding `WeatherCondition` itself to 27 values — rejected; it would
force every consumer of `WeatherCondition` (the low-confidence guard, the windy override, the
cloud-cover fallback, CSS color classes keyed by condition name) to handle 27 cases even though
only SMHI's own forecast can ever produce more than about a dozen meaningfully distinct ones from
amount/cloud data alone. Keeping the raw code as a separate, additive field confines the new
complexity to exactly where it's needed: icon selection.

## 2. A separate, code-keyed icon lookup for the 27 SMHI codes

**Decision**: Add a new module, `src/components/smhiSymbolIcons.ts`, exporting
`SMHI_SYMBOL_ICONS: Record<number, { src: string; label: string }>` (or similar), one entry per
code 1-27, each pointing at an image asset and carrying the same English label style
`WEATHER_ICONS` already uses (e.g. "Moderate rain showers"). A period's icon is chosen by:
1. If `smhiSymbolCode` is present and in `SMHI_SYMBOL_ICONS`, render that image.
2. Otherwise, fall back to today's existing `deriveWeatherCondition` + `WEATHER_ICONS` lookup
   (unchanged — spec FR-003/User Story 2).

**Rationale**: `WEATHER_ICONS` (`src/components/weatherIcons.tsx`) is a `Record<WeatherCondition,
{Icon: LucideIcon, label}>` — a *component* registry. Lucide's fixed vocabulary has no way to
represent three distinct intensity tiers per precipitation type (only one "light" and one "heavy"
shape exist per type today), so reaching 27 *visually distinct* results via lucide alone isn't
achievable without composing/recoloring in ways that stop looking like the rest of the app's icon
set. Since the user has already supplied (and cropped, per this session) real per-code artwork —
see §3 — an image-based registry keyed by the same 1-27 numbers SMHI itself documents is the
natural fit, and satisfies User Story 3/FR-005 directly: replacing any one code's file later
requires no change to this module's structure, only swapping the file at that path.

**Alternatives considered**:
- Extending `WEATHER_ICONS` in place — rejected; it's typed `Record<WeatherCondition, ...>` and
  reused by every non-SMHI-code path (§1's rationale), so conflating the two would either break
  that typing or require the 27 new values to also be valid `WeatherCondition`s (reopening the
  rejected alternative in §1).
- A single sprite-sheet image with CSS background-position offsets (avoids 27 separate file
  requests) — rejected for now as a premature optimization; 27 small PNGs is a negligible load for
  a weather dashboard already fetching live data on every view, and separate files are far simpler
  to replace one at a time (User Story 3) than recalculating sprite offsets after every edit.

## 3. Icon artwork for the initial implementation

**Decision**: Use the user-supplied `docs/logos/smhi_symbols_ver2.png` reference sheet, split into
27 individual, text-free icon images this session
(`docs/logos/smhi_symbols_ver2_icons/01-clear.png` … `27-heavy-snowfall.png` — the number badge and
Swedish caption cropped out, auto-trimmed to the icon's own bounding box). These become the actual
initial asset files the new registry points at, copied into `src/assets/weather-icons/` (or
similar, decided during implementation) so they're bundled the same way the app's other static
images already are (e.g. `leaflet/dist/images/marker-icon.png` imports in `MapView.tsx`).

**Rationale**: The user explicitly asked for the text-free split rather than a lucide-composed
placeholder or empty slots (a three-way choice offered during planning) — real, distinct, ready-to
use artwork already exists, so there's no reason to ship something worse in the meantime.

**Consequence for User Story 3**: Because the icons are separate files referenced by a simple
1-27 lookup, the user's expected future revisions (a "ver3," etc.) mean re-running the same
cropping approach (or replacing files directly) and swapping the referenced files — no code change
to the lookup itself, satisfying FR-005.

## 4. Accessibility and existing consumers

**Decision**: Each `SMHI_SYMBOL_ICONS` entry's `label` is used the same way `WEATHER_ICONS`
entries' labels are today — as the accessible name/`aria-label` for the rendered icon, and as the
plain-language description text (e.g. `TodaySummaryCard`'s `${iconInfo.label}.` line). No
consuming component's accessibility contract changes; only which registry supplies `Icon`/`src` +
`label` differs, chosen per period as in §2.

**Rationale**: Matches the existing pattern exactly (`iconInfo.label`, `<iconInfo.Icon
aria-label={iconInfo.label} />`), so no new accessibility work is needed beyond wiring the new
lookup's label through the same props.

## 5. Scope: hourly periods only, not daily/weekly aggregates

**Decision**: `smhiSymbolCode` (and therefore the 27-icon lookup) applies only to hourly periods
(`TimelinePeriod`s built by `buildHourlyTimelineData`, `timelineData.ts:290-334`) — the ones that
correspond to exactly one SMHI forecast hour and therefore exactly one `symbol_code`. Daily/weekly
periods (`daysToTimelineData`, `timelineData.ts:354-395`; `DailyAggregate` in
`dailyAggregation.ts`; the Today card; `WeeklyForecastStrip`) continue to resolve their icon via
the existing `deriveWeatherCondition` fallback, unchanged — they average/aggregate many hours'
worth of data already, and `DailyAggregate` has no symbol-code concept today.

**Rationale**: A `symbol_code` is inherently an hourly-forecast property — SMHI issues one per
hour, not one per day. Inventing a "the day's representative code" (e.g. picking the midday hour's
value) would be new aggregation behavior nobody asked for, and risks being actively misleading
(a day's Today-card icon suddenly jumping to reflect only one hour's situation, disagreeing with
its own high/low/rain-total figures which are genuinely averaged/summed). This still satisfies
spec FR-003 as written: a daily period simply has no known `symbol_code`, so it uses the existing
fallback, exactly like every other "no code" case.

**Alternatives considered**: Adding a `chanceOfRainMax`-style `symbolCodeAtMidday` to
`DailyAggregate` — rejected as scope creep the user didn't ask for; can be proposed as a follow-up
if wanted, once the hourly case is live and reviewed.

## 6. Where this affects rendering

**Decision**: Every existing call site that currently does
`condition !== null ? WEATHER_ICONS[condition] : null` and then renders `<iconInfo.Icon />` needs a
small adapter to also check for a `smhiSymbolCode` first (per §2's two-step lookup) and render
either an `<img>` (SMHI-code path) or the existing `<iconInfo.Icon />` (fallback path). Confirmed
call sites: `WeatherIconOverview.tsx` (`ConditionRow`, `TodaySummaryCard`'s condition icon prop
source), `WeeklyForecastStrip.tsx`, `ObservationDetails.tsx`, `WEATHER_ICONS` usage in
`TodaySummaryCard.tsx` itself. A single shared helper component (e.g. `<ConditionIcon period=
{...} size={...} />`) centralizes the two-step lookup so each call site doesn't duplicate the
branching logic.

**Rationale**: Avoids repeating the "SMHI code first, else derived condition" branch at every
call site — matches the project's existing preference for small shared components
(`WEATHER_ICONS` itself is already a single shared lookup table consumed from multiple places).

**Alternatives considered**: Doing the two-step lookup inline at each of the ~4-5 call sites —
rejected as needless duplication once a shared helper is just as simple.

## 7. Testing approach

**Decision**: Unit-test the new lookup logic directly (e.g. `tests/unit/smhiSymbolIcons.test.ts` or
extend `weatherCondition.test.ts`): given a period with `smhiSymbolCode` set to each of 1-27,
confirm a distinct icon/label is returned for each; given a period with no `smhiSymbolCode`,
confirm the existing `deriveWeatherCondition` fallback path still runs unchanged. Extend existing
integration tests (`weatherIconOverview.test.tsx`) with one or two cases confirming a specific SMHI
code (e.g. 9 vs. 10) renders visibly different `src`/`alt` on the Overview.

**Rationale**: Matches existing project convention — service-level logic gets direct unit tests;
component wiring gets a couple of integration-level spot checks, not exhaustive per-code component
tests (27 near-identical component tests would be low-value; the lookup table itself is what needs
per-code coverage).
