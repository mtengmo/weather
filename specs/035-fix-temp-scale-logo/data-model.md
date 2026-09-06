# Data Model: Fix Temperature Scale Layout and Add Header Logo

No new or changed data entities, types, or persisted state. `Tick` (`{ value: number; y: number }`,
already defined in `WeatherIconOverview.tsx`) is unchanged in shape; only which computed ticks are
passed to the label-rendering path changes (a new filtering function narrows the list, gridlines
still use the full list). No component prop shapes, hooks, or storage schemas change.
