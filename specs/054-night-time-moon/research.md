# Research: Night-Time Moon Variants for Sun-Depicting Icons

## 1. Source artwork

**Decision**: `docs/logos/symbols_night_ver1.png` — a 2×2 grid (1536×1024, cell 768×512), with **real alpha transparency** (confirmed: corners alpha=0, moon body alpha≈253, glow fades to alpha=0 — unlike every prior `ver3`-`ver7` sheet, which were all fully opaque RGB with a fake checkerboard). Cropped directly with a simple alpha-bounding-box autotrim — no flood-fill/component-analysis needed this time, since the transparency is genuine.

**Mapping** (cloud coverage increases left-to-right, top-to-bottom, mirroring the existing day icons' own 1→4 progression):
- Cell (0,0) → code 1, Clear night: moon alone, no cloud.
- Cell (0,1) → code 2, Nearly clear night: small cloud, ~15% of moon covered.
- Cell (1,0) → code 3, Variable cloudiness night: medium cloud, ~50% covered.
- Cell (1,1) → code 4, Halfclear night: large cloud, only a sliver of moon visible.

Saved as `docs/logos/symbols_night_ver1_icons/{01-clear-night,02-nearly-clear-night,03-variable-cloudiness-night,04-halfclear-night}.png`, then copied into `src/assets/weather-icons/`.

## 2. Where "night" is determined

**Decision**: Reuse `weatherCondition.ts`'s existing private `isNight(timestamp): boolean` (the same `hour < 6 || hour >= 20` local-clock rule already used for the fallback clear-day/clear-night split) — export it rather than duplicating the rule a second time.

**Rationale**: DRY; matches spec's Assumption of reusing the app's existing day/night rule rather than inventing a new one (e.g. sunrise/sunset-based).

## 3. Threading the night signal to both resolvers

**Decision**:
- `resolveConditionIcon(input)`: `input.timestamp` is already present (used by `deriveWeatherCondition` internally) — compute `isNight(input.timestamp)` inside the function itself. No call-site change needed (`ObservationDetails.tsx` already passes `timestamp`).
- `resolveConditionIconFromCondition(smhiSymbolCode, condition, isNight)`: gains a third parameter. Its one call site, `WeatherIconOverview.tsx`'s `ConditionRow`, already has `period.key` — the period's own ISO timestamp for hourly periods (`key: obs.timestamp` in `timelineData.ts`) — so it computes `isNight(period.key)` and passes it through. Daily periods also reach this resolver but never carry an `smhiSymbolCode` (FR-005), so the night lookup is simply never exercised for them regardless of what `period.key` contains.

**Rationale**: No new data model field needed — `period.key` already holds the exact information required.

## 4. Where the night entries live

**Decision**: A second, smaller map, `NIGHT_VARIANT_ICONS: Partial<Record<number, SmhiSymbolIconEntry>>`, covering only codes 1-4 — not a change to `SMHI_SYMBOL_ICONS` itself. `resolveFromParts` checks this map first (only when `isNight` is true), falling back to `SMHI_SYMBOL_ICONS` when there's no night entry for that code (covers codes 5-27 automatically, satisfying FR-003 with zero special-casing).

**Rationale**: Directly satisfies FR-004 ("additional lookup dimension... not a redesign of the mapping") — `SMHI_SYMBOL_ICONS` keeps its exact existing 27-entry shape and remains the single source of truth for "what does code N look like in the default/day case," while night is a pure overlay.
