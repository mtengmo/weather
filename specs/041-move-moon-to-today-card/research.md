# Phase 0 Research: Declutter Timeline Header and Move Moon Phase to the Today Card

## 1. Locating the block to remove

**Decision**: Remove two things from `src/components/WeatherIconOverview.tsx`'s Overview render:
the `dataSourceNote(series)` paragraph (`<p className="data-source-note">`, ~line 846-848) and the
`SunMoonSummary` component's Sunrise/Sunset spans (~line 619-635, rendered at ~line 860, directly
above `.weather-timeline-wrap`). Keep the moon-phase computation (`getMoonPhase`, already in
`src/services/sunMoon.ts`) — only its Overview-timeline display goes away, and `SunMoonSummary`
itself is deleted entirely once nothing in it remains needed there.

**Rationale**: This exact three-line block ("Data: SMHI" / "Sunrise: ..." / "Sunset: ..." /
"Moon: ...") only exists in one place in the codebase — confirmed by searching for `"Data: SMHI"`,
`Sunrise:`, and `Moon:` — matching the user's description precisely. The Details/graph view
(`ObservationChart.tsx`) has its own, separate `dataSourceNote` paragraph and no sun/moon display
at all, so it's untouched (FR-005).

**Alternatives considered**: Hiding the block via CSS instead of removing the JSX — rejected;
leaves dead code and the underlying `getSunTimes`/`getMoonPhase` calls still running for no
displayed purpose above the timeline (the Today card already calls `getSunTimes` itself
independently).

## 2. Where the moon phase moves to

**Decision**: Add a `Moon {phase}` span to `TodaySummaryCard.tsx`'s existing
`.today-summary-detail` row that already shows Sunrise/Sunset (~line 92-95), using the same
`getMoonPhase` function and the same `.replace("-", " ")` display formatting `SunMoonSummary`
already used (e.g. "waning crescent").

**Rationale**: `TodaySummaryCard` is "the above daily summary" the user pointed at — it already
sits above the timeline, already shows Sunrise/Sunset for the same location/date, and already has
a `.today-summary-detail` row pattern to extend (matches the existing Rain/Wind row's structure
one row up). No new component needed.

**Alternatives considered**: A new dedicated row for Moon alone — rejected as unnecessary; it fits
naturally alongside Sunrise/Sunset (same date-derived, sky-related figures) in the existing row
without crowding it (a single extra short word like "waning crescent" is comparable in length to
the existing sunrise/sunset time strings).

## 3. Moon-phase "can't be determined" edge case (FR-004 acceptance scenario 2)

**Decision**: No code path is needed for this — `getMoonPhase(date)` is a pure, always-succeeding
calculation (a deterministic day-counting formula, confirmed by reading `sunMoon.ts`), unlike
`getSunTimes`, which can genuinely return `null` for polar day/night. There is no real "moon phase
unavailable" case to degrade for today.

**Rationale**: Keeping the spec's edge case as documentation of expected behavior is still
reasonable (a future data source change could introduce nullability), but no additional
`null`-handling code is being added since the current function type (`MoonPhase`, non-nullable)
makes it unreachable. Test coverage focuses on the always-present case.

## 4. Testing approach

**Decision**: Update `tests/integration/weatherIconOverview.test.tsx`'s two affected tests: the
"renders a Sun & Moon summary with sunrise/sunset/phase text" test (~line 806, under "US3: sun/moon
and enrichment rows") becomes an assertion that Sunrise/Sunset/Data-source text is *absent* above
the timeline, and the "data source note" describe block (~line 1430) is removed/updated to confirm
absence rather than presence. Add a `Moon {phase}` assertion to the existing
`TodaySummaryCard`/`WeatherIconOverview` tests that already exercise the Today card's Sunrise/
Sunset row.

**Rationale**: Matches existing project convention (integration tests against the rendered
Overview/Today card) — no new test tooling needed.
