# Phase 1 Data Model: Swedish Translation Based On Browser Language

No persisted or transmitted entities — this feature adds two static resource files and a
detection step; no runtime data model beyond that.

## `TranslationResource` (shape of `src/i18n/en.ts` and `src/i18n/sv.ts`)

```ts
type TranslationResource = Record<string, string>;
```

A flat map of dotted, component-prefixed keys to their string value in that language (e.g.
`{ "todaySummary.highLabel": "High", ... }`). Both files MUST have exactly the same key set
(validated by `tests/unit/i18n.test.ts`, research.md §3/§5) — this is the one invariant the whole
feature depends on to avoid a partially-translated UI.

## `Locale` (the two supported values)

```ts
type Locale = "en" | "sv";
```

Resolved once, at app start (`src/i18n/index.ts`), from `navigator.language`/`navigator.languages`
via the rule in research.md §2. Not stored anywhere (no persistence — spec.md's Assumptions
explicitly scope out a manual override to remember), so a fresh page load always re-detects it.

## Validation rules

- `en.ts` and `sv.ts` have identical key sets (`Object.keys(en).sort()` deep-equals
  `Object.keys(sv).sort()`).
- No key in either file resolves to an empty string (`""`) — an empty translation is
  indistinguishable from "not yet translated" and must fail the same test that catches a missing
  key.
- Every translation key actually used in a component (via `t("...")`) exists in both resource
  files — enforced implicitly: since both files are the sole source of truth and a missing key
  would render `i18next`'s fallback (the key itself) on screen, this is caught by the visual
  QA/independent-test step in each of tasks.md's per-file migration tasks, not by a separate
  automated "key usage" scan (out of scope for this feature's size).

## State transitions

None — the resolved `Locale` is fixed for the lifetime of one page load (spec.md's Assumptions:
"changing the browser's language preference and reloading the app" is the only way to switch,
matching SC-003 exactly).
