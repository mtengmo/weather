# Data Model: Update SMHI Symbol Icons to Ver6 Artwork

No application data model changes — this feature replaces static image bytes only. `SMHI_SYMBOL_ICONS` (`src/components/smhiSymbolIcons.ts`) keeps its existing shape:

```ts
export interface SmhiSymbolIconEntry {
  src: string;
  label: string;
}
export const SMHI_SYMBOL_ICONS: Record<number, SmhiSymbolIconEntry> = { 1: {...}, ..., 27: {...} };
```

Each of the 27 `src` imports continues to point at the same filename under `src/assets/weather-icons/` (e.g. `01-clear.png`); only the bytes those files contain change, from ver2 artwork to ver6 artwork. No entry is added, removed, or renamed.

## Extraction intermediate (not part of the app)

A one-off Python script produces 27 files under `docs/logos/symbols_ver6_icons/`, one per SMHI code, named identically to the 27 files under `src/assets/weather-icons/`. This directory is a build-time source artifact (checked into the repo as the "source of truth" for this artwork revision, mirroring `smhi_symbols_ver2_icons/` from 043), not something the running app reads.
