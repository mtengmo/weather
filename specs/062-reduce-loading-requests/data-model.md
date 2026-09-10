# Phase 1 Data Model: Reduce Loading Requests

No persisted or transmitted entities, and no change to any existing data shape
(`ObservationSeries`, `MultiSourceForecastEntry`, `UseObservationDataResult` are all unchanged).
Documented here is the one new in-memory concept this feature introduces.

## `WindowFetchCache` (new, internal to `useObservationData.ts` — not exported)

```ts
interface WindowFetchCache {
  locationKey: string; // `${latitude},${longitude}` of the location this cache was built for
  refreshGeneration: number; // the `refreshTick` value at the time this cache was (re)built
  byWindow: Map<
    ObservationWindow,
    { series: ObservationSeries; multiSource: MultiSourceForecastEntry[] }
  >;
}
```

Held in a `useRef<WindowFetchCache | null>`, not `useState` — reading/writing it must never itself
trigger a re-render (only the `series`/`multiSourceForecast`/`weeklySeries` state setters that
consult it do).

## Validation rules

- A cache is only ever consulted when its `locationKey` matches the current location and its
  `refreshGeneration` matches the current `refreshTick` — any mismatch means "treat as empty, fetch
  fresh," never a partial/best-effort reuse.
- `byWindow` never holds more than 3 entries (one per `ObservationWindow` value) — bounded by the
  type itself, no eviction policy needed.
- A cache entry, once written, is never mutated — a window switch either reads an existing entry or
  adds a new one; a genuine refresh/location change discards the whole cache object and starts a
  new one, rather than mutating entries in place.

## State transitions

- **Location changes** → cache is discarded and rebuilt from scratch (new `locationKey`), matching
  the hook's existing "reset to null while loading" behavior for a genuine location change
  (unaffected by this feature).
- **`refreshTick` changes** (periodic 15-minute timer or tab-visibility regain, per
  059-periodically-auto-refresh) → cache is discarded and rebuilt, so the next fetch for every
  window is genuinely fresh — this is what bounds the staleness the spec's Edge Cases section
  accepts.
- **`window` changes alone** (same location, same `refreshTick`) → cache is consulted; a hit skips
  the network call entirely, a miss fetches and then writes a new entry.
