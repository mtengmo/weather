# Contract: Rain Bar Baseline, Panel Contrast, Icon Sizing, Version (US3, US4, US5, US6)

## `src/components/WeatherIconOverview.tsx` — Rain row (US3)

See `data-model.md` for the exact JSX moving `.weather-timeline-bar-chance` inline within
`.weather-timeline-bar-value` instead of as a sibling stacked line. `BarRow`'s existing height
math (`Math.max(2, (point.value / max) * 100)`) and `.weather-timeline-bar-cell`'s
`justify-content: flex-end` are both unchanged — the fix is purely about which children exist in
the flex stack, not the stack's own alignment rule.

## `src/index.css` — `.weather-timeline-bar-chance` (US3)

```css
.weather-timeline-bar-chance {
  font-size: 0.65rem;
  color: var(--text-muted);
  opacity: 0.8;
}
```

(Rule itself is unchanged — only its position in the DOM moves, per the JSX change above; no
`display: block` or similar forcing it onto its own line remains needed once it's an inline
`<span>` within the value text.)

## `src/index.css` — `.location-panel-content`, `.display-menu-content` (US4)

See `data-model.md` for the two-layer `box-shadow` replacing the single dark-only layer on both
rules.

## `src/components/WeeklyForecastStrip.tsx` (US5)

See `data-model.md` for the `size={24}` → `size={28}` change.

## `package.json` (US6)

See `data-model.md` for the version bump (`0.1.0` → `0.1.1`).

## No changes to

- `.weather-timeline-bar`, `.weather-timeline-bar-cell`, `.weather-timeline-row-bars` — their own
  height/baseline CSS is already correct (fixed in 019); this round only changes what else shares
  the flex stack.
- `ConditionRow`'s own icon size (`28`, in `WeatherIconOverview.tsx`) — the target size
  `WeeklyForecastStrip.tsx` is being changed to match, not itself changed.
- `.location-panel-content`'s existing `border: 1px solid var(--border)` — kept as-is; the fix
  adds a shadow layer, not a border-color change.
