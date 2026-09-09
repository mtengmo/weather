# Feature Specification: Split Informational SMHI Warnings Into the Daily Brief

**Feature Branch**: `048-split-informational-smhi`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "the warnings, now in Uppsala it's two, and I don't see the new one for tomorrows rain? Is it because I have checked that I don't want to see the old warning? The warning for tomorrow is Yellow level, for heavy rain. The water warning, not sure which color it is. Could we improve this? is it different kind of warning? should be added to daily brief for the active day, but as you did earlier, the warning itself should be visible as a notice as for now before it happen."

Context: Diagnosed directly against SMHI's live public warnings feed while writing this spec — as of now, Uppsala County has exactly one published warning: "Risk for water shortage," at SMHI's **Message** level (their lowest, non-color-coded severity, ongoing since 2026-07-06 with no end date). No "heavy rain, Yellow" warning for Uppsala is present in that feed yet. Dismissal (`028-severe-weather-warnings`/`032-dashboard-polish-round-seven`) is keyed per exact warning id and cannot suppress an unrelated warning, so dismissing the water-shortage notice is **not** why the rain warning is missing — it simply hasn't been published to the public feed this app reads from yet, even though it may already be visible in SMHI's own consumer app (which may draw on more real-time internal data). That gap isn't something this app can fix.

What *can* be improved, and is this feature's actual scope: SMHI's **Message** level is a different kind of notice than their color-coded **Class 1/2/3 (Yellow/Orange/Red)** levels — it's long-running, informational, hydrological/background-condition advisory (e.g. "risk of water shortage"), not a time-bound weather danger. Today, both kinds are treated identically: shown in the same dismissible top-of-page banner (`028-severe-weather-warnings`, extended for upcoming warnings by `045-show-upcoming-smhi`). That's a mismatch for the Message kind, and likely why the user dismissed it — it doesn't carry the same urgency, yet takes the same prominent, alert-styled spot as an actual severe-weather warning.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Informational notices sit in the daily brief, not the alert banner (Priority: P1)

A viewer looking at their location's "Today" summary sees any active informational (Message-level) SMHI notice — like a water-shortage advisory — as part of that everyday summary, rather than in the same alert-styled banner used for actual severe-weather warnings.

**Why this priority**: This is the core improvement — it fixes the mismatch between an ongoing background advisory and a genuine, time-bound weather danger, which is what caused the viewer to dismiss it in the first place.

**Independent Test**: Mock one active Message-level warning and no color-coded ones for a location; confirm it appears within the Today card's content and does **not** appear in the standalone warning banner.

**Acceptance Scenarios**:

1. **Given** an active Message-level SMHI warning for the viewed location, **When** the viewer looks at the Today card, **Then** the warning's description appears there.
2. **Given** that same warning, **When** the viewer looks for the standalone warning banner, **Then** it does not appear there.
3. **Given** no active Message-level warning, **When** the viewer looks at the Today card, **Then** nothing about it changes from today.

---

### User Story 2 - Real severe-weather warnings keep their advance-notice banner (Priority: P1)

A viewer with an active or soon-to-start (per `045-show-upcoming-smhi`) color-coded (Yellow/Orange/Red) SMHI warning continues to see it in the standalone, prominent banner exactly as today — unaffected by where informational notices now live.

**Why this priority**: Equally essential — the whole point is to stop treating the two kinds the same, not to weaken the genuinely urgent one. This is also the direct fix for the user's underlying "will I get warned before it happens" concern.

**Independent Test**: Mock one active Yellow-level warning and one active Message-level warning for the same location; confirm the Yellow one appears in the banner (with its upcoming/active treatment intact) while the Message one appears only in the Today card.

**Acceptance Scenarios**:

1. **Given** an active or upcoming color-coded warning, **When** the viewer looks at the standalone banner, **Then** it appears there exactly as it does today, including the "starts in X" treatment for one that hasn't started yet.
2. **Given** both a color-coded warning and a Message-level warning active at once for the same location, **When** the viewer looks at the page, **Then** both are visible — one in the banner, one in the Today card — independently of each other.

---

### Edge Cases

- What happens if a viewer has previously dismissed the banner form of a warning that this feature now moves to the Today card? The Today card's informational notices are not individually dismissible (they're a small part of the everyday summary, not a persistent nag), so this concern doesn't carry over — removing the ambiguity that caused the user's original question.
- What happens when SMHI hasn't yet published a warning that's already visible elsewhere (e.g. SMHI's own app)? Out of scope — this app can only reflect what its public data source currently returns; no user-facing fix is possible for data that isn't published yet.
- What happens to a Message-level warning with no stated end date (like the water-shortage one, ongoing since July)? It continues to show in the Today card for as long as it remains active per the data source, the same "still active" rule already used for the banner today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST distinguish SMHI's informational (Message-level) warnings from its color-coded (Yellow/Orange/Red, i.e. Class 1/2/3) warnings.
- **FR-002**: An active Message-level warning for the viewed location MUST be shown within the Today card's content.
- **FR-003**: A Message-level warning MUST NOT appear in the standalone warning banner.
- **FR-004**: A color-coded warning (active or upcoming within the near-term window) MUST continue to appear in the standalone warning banner exactly as it does today, with no behavior change.
- **FR-005**: Message-level warnings shown in the Today card MUST NOT be individually dismissible.
- **FR-006**: Both kinds of warning MUST be able to be shown at once, independently, when both are active for the same location.
- **FR-007**: A location with no active Message-level warning MUST show the Today card unchanged from today (no empty placeholder).

### Key Entities

- **Warning kind**: A classification derived from SMHI's own severity code — "informational" (Message level) vs. "color-coded" (Yellow/Orange/Red) — determining which of the two display locations (Today card vs. standalone banner) a given warning is routed to.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of active Message-level warnings for a location appear in that location's Today card.
- **SC-002**: 0% of Message-level warnings appear in the standalone warning banner.
- **SC-003**: 100% of color-coded warnings (active or upcoming) continue to appear in the standalone banner, unchanged from current behavior.
- **SC-004**: 0 instances of one warning's visibility (shown, dismissed, or otherwise) affecting an unrelated warning's visibility.

## Assumptions

- "Daily brief for the active day" refers to the existing "Today" summary card, which already serves as the app's everyday-conditions summary for the viewed location's current day.
- Only SMHI's own warnings feed carries a Message-vs-color-coded distinction today; this feature applies to SMHI-sourced warnings only, consistent with how warnings already work in this app.
- A Message-level warning's relevance to "today" is determined by whether it's currently active (per the feed's own start/end fields), the same test already used for the banner — not by any new date-matching logic.
- This feature does not and cannot make an unpublished SMHI warning appear sooner; it only changes where an already-published warning is displayed based on its kind.
