# Phase 0 Research: Swedish Translation Based On Browser Language

## 1. Library choice: `i18next` + `react-i18next`

**Decision**: Add `i18next` and `react-i18next` as the translation mechanism.

**Rationale**: Confirmed via direct inspection that the app has zero i18n infrastructure and
~100-150+ hardcoded English strings across ~22 component files, several of which interpolate a
live value into fixed English text (e.g. `"High ${value}°"`, `"Data: Open-Meteo"`,
`"${count} min ago"`-shaped patterns). At this string volume and with real interpolation needs, a
tested library beats a hand-rolled `t()` function — `i18next`/`react-i18next` is the de facto
standard for React, small, has no server dependency (everything runs client-side, matching this
app's existing all-client-side architecture), and its `useTranslation()` hook fits this codebase's
existing hooks-based component style directly.

**Alternatives considered**:
- Hand-rolled `t(key)` + a plain object dictionary — rejected; would need to reinvent
  interpolation (`{{value}}` substitution) that `i18next` already provides, for no real benefit at
  this string count.
- `react-intl` (FormatJS) — rejected; heavier API surface (ICU MessageFormat) than this app's needs
  (no pluralization-heavy or gender-aware strings identified in the existing text), and
  `react-i18next`'s simpler flat-key model matches this app's simpler, mostly declarative-label
  style of copy more directly.

## 2. Language detection: no browser-detector plugin needed

**Decision**: Detect the language once, at `src/i18n/index.ts`'s init time, with a single explicit
rule: if `navigator.language` (or the first entry of `navigator.languages`, when present) starts
with `"sv"` (case-insensitive), initialize `i18next` with `lng: "sv"`; otherwise `lng: "en"`.

**Rationale**: Spec.md's Assumptions already settle the only real ambiguity (treat every Swedish
regional variant — `sv`, `sv-SE`, `sv-FI` — as Swedish; anything else falls back to English) —
that's a one-line `startsWith` check, not a rule set complex enough to justify pulling in
`i18next-browser-languagedetector` (which supports many more detection sources — cookies, URL
query params, `localStorage` — none of which this feature asks for, per spec.md's explicit
"no manual override" scope boundary).

**Alternatives considered**: `i18next-browser-languagedetector` — rejected as unnecessary
complexity for a single, explicit detection rule this feature actually needs; can be added later
without disruption if a future feature wants persistence/manual override (it would slot in as an
addition to `src/i18n/index.ts`, not a rewrite).

## 3. Translation key naming and resource file shape

**Decision**: Flat, per-component-prefixed keys in one `en.ts`/`sv.ts` pair (not one file per
component) — e.g. `"todaySummary.highLabel"`, `"warningBanner.dismiss"`,
`"howItWorks.title"`. Interpolated values use `i18next`'s `{{placeholder}}` syntax, e.g.
`"todaySummary.now": "Now {{temperature}}°"`.

**Rationale**: A single pair of files is simple to keep in sync (the one new test in
`tests/unit/i18n.test.ts`, per data-model.md, checks both files have identical key sets) and easy
to grep/diff during review; per-component prefixes keep keys namespaced and readable without
needing nested JSON structures or a build step to merge many small files. This mirrors the flat,
readable style already used elsewhere in this codebase (e.g. `SMHI_SYMBOL_LABELS` in
`smhiSymbolIcons.ts` is one flat table, not one file per code).

**Alternatives considered**: One namespace file per component (`i18next`'s native "namespaces"
feature) — rejected; adds `i18next`'s namespace-loading configuration for no benefit at this scale
(a few hundred short strings total, not large enough to need lazy per-namespace loading).

## 4. Strings that mix translated text with untranslated data (brand names, place names)

**Decision**: Split these into an interpolated translation key plus the untranslated value passed
as a variable — e.g. `format.ts`'s `"Data: Open-Meteo"` becomes translation key
`"format.dataSource": "Data: {{source}}"` called as `t("format.dataSource", { source: "Open-Meteo"
})`; `"SMHI observations"` becomes `"format.sourceObservations": "{{source}}-observationer"` (or
equivalent Swedish word order) called with `{ source: "SMHI" }`. This is exactly what spec.md's
Edge Cases already calls for ("the surrounding label translates; the data value itself... is not
altered").

**Rationale**: `i18next`'s interpolation is built for exactly this — translating the sentence
structure while treating a value as an opaque substitution — and per spec.md's own Assumptions,
brand names (`Open-Meteo`, `SMHI`) and place names from search/geocoding are never translated
regardless of the surrounding sentence's language.

## 5. Testing browser-language detection

**Decision**: `tests/unit/i18n.test.ts` verifies resource-file key parity (every key in `en.ts` has
a matching key in `sv.ts`, neither has an empty string) — a plain data check, no `i18next` runtime
needed. Component-level integration tests that need to assert Swedish text mock
`navigator.language` via `vi.stubGlobal("navigator", { language: "sv-SE", ... })` (mirroring this
codebase's existing `vi.stubGlobal("navigator", ...)` pattern already used for geolocation mocks
in `tests/integration/appHeader.test.tsx`) before rendering, then re-initialize `i18next` for that
test (or import a test-only re-init helper from `src/i18n/index.ts`) so the language takes effect
within the test's own render.

**Rationale**: Reuses an already-established mocking pattern in this codebase rather than
inventing a new one; keeps the exhaustive "does every single string translate" burden on the
resource-file parity check (cheap, exhaustive, no rendering needed) rather than trying to
render-and-assert all ~100-150 strings individually.

## 6. Migration order — file-by-file, largest/most-visible first

**Decision**: Migrate components in roughly this order: `App.tsx`/header controls and
`TodaySummaryCard.tsx`/`WeatherIconOverview.tsx` (most visible, most user-facing text) first, then
the remaining views (`ObservationDetails.tsx`, `WeeklyForecastStrip.tsx`, `MapView.tsx`, etc.),
then the two long-form content components (`HowItWorks.tsx`, `PrivacyNotice.tsx`, mostly prose —
mechanical but high string-count), then `src/services/format.ts` last (smallest, most isolated).
Each file's migration is independently testable and shippable — matches this app's own established
"independently testable increment" convention from every prior spec's User Story breakdown.

**Rationale**: Front-loads the highest-visibility surface area so partial progress already
delivers real, visible value (SC-001 measures 100% coverage, but an in-progress migration is still
correctly split into independently checkable pieces along the way).
