# Contract: Home navigation (US3) and warning dismissal (US4)

## "Home" controls

**Contract**: Every control in `App.tsx` that currently reads "Back" (graph, details, and Map
views) is labeled "Home" and, when activated, results in `view === "overview"` — regardless of
which view was active immediately beforehand. No other button's label or behavior changes.

## `useWarningDismissal()`

**Contract**: Returns `{ dismissedIds: Set<string>; dismiss: (id: string) => void }`.
`dismissedIds` is read from `localStorage` once on mount (empty `Set` if absent/unparseable —
never throws). `dismiss(id)` adds `id` to both the in-memory set and the persisted array
immediately (synchronous, matching this app's existing preference-hook convention). A component
re-rendering after `dismiss` sees the updated set on its next render.

## `App.tsx` warning filtering

**Contract**: `warnings` passed to `<WarningBanner />` is `warnings.filter(w =>
!dismissedIds.has(w.id))` — a warning whose `id` is in `dismissedIds` never reaches the banner at
all. `WarningBanner` itself is unaware of dismissal state beyond the array it's given.

## `WarningBanner`'s dismiss control

**Contract**: Each listed warning (collapsed leading warning, and every warning in the expanded
list) has its own dismiss control, calling `dismiss(warning.id)` for that specific warning only —
dismissing one warning never affects any other warning currently shown.
