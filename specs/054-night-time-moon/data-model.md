# Data Model: Night-Time Moon Variants for Sun-Depicting Icons

## New: NIGHT_VARIANT_ICONS

```ts
const NIGHT_VARIANT_ICONS: Partial<Record<number, SmhiSymbolIconEntry>> = {
  1: { src: clearNight, label: "Clear sky" },
  2: { src: nearlyClearNight, label: "Nearly clear sky" },
  3: { src: variableCloudinessNight, label: "Variable cloudiness" },
  4: { src: halfclearNight, label: "Halfclear sky" },
};
```

Same `label` text as the corresponding day entry in `SMHI_SYMBOL_ICONS` — only the artwork differs, not the situation being described.

## resolveFromParts (extended)

```ts
function resolveFromParts(
  smhiSymbolCode: number | null | undefined,
  condition: WeatherCondition | null,
  isNightNow: boolean
): ResolvedConditionIcon | null {
  if (smhiSymbolCode != null) {
    const entry = (isNightNow ? NIGHT_VARIANT_ICONS[smhiSymbolCode] : undefined) ?? SMHI_SYMBOL_ICONS[smhiSymbolCode];
    if (entry) return { kind: "smhi-symbol", src: entry.src, label: entry.label };
  }
  // ...unchanged fallback path
}
```

## Public resolvers (extended)

- `resolveConditionIcon(input)` — unchanged signature; computes `isNight(input.timestamp)` internally when `input.timestamp` is present, else `false`.
- `resolveConditionIconFromCondition(smhiSymbolCode, condition, isNightNow: boolean = false)` — one new parameter, defaulted so existing call sites that genuinely have no timestamp (if any) don't break.
