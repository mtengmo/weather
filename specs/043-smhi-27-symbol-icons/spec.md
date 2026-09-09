# Feature Specification: 27 Distinct Icons for SMHI's Weather Symbol Codes

**Feature Branch**: `043-smhi-27-symbol-icons`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description:
"I want to have 27 different icons for smhi symbol_code from the api, I have generate a large image under docs\logs\smhi_symbol.png with all on a row. seems you are lacking or combining some today.
I will probably re-create the icons with new versions, so prepare for it."

Clarified with the user: today the app collapses SMHI's 27 `symbol_code` values down to about a dozen icon "buckets" (e.g. codes 9 and 19, "moderate rain showers" and "moderate rain," both currently show the same heavy-rain icon; light/moderate/heavy sleet all share a single sleet icon). Asked whether every one of the 27 codes should get its own distinct icon, the user confirmed: **yes, for any period where SMHI's own `symbol_code` is available** — periods without one (other weather sources, or observed/historical data) keep today's existing simplified icon logic, mapped onto whichever of the 27 icons is the closest match.

The user has since supplied two successive reference images showing all 27 icons together with a label for each code (`docs/logos/smhi_symbols.png`, then a revised `docs/logos/smhi_symbols_ver2.png`) and expects to keep revising the actual artwork — the feature should treat "which icon graphic represents code N" as something easy to swap out later, not hard-coded once and forgotten.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the specific weather situation SMHI is actually forecasting (Priority: P1)

A viewer looks at a forecast period's icon and expects it to reflect the specific situation SMHI's own forecast describes (e.g. "moderate rain showers" looking different from "heavy rain showers," and both looking different from steady non-shower "moderate rain") rather than several different SMHI situations all rendering as the same generic icon.

**Why this priority**: This is the entire request — the current icon set visibly under-represents the detail SMHI's forecast already provides.

**Independent Test**: For a set of forecast periods covering a representative spread of SMHI's 27 symbol codes, confirm each code renders a visually distinct icon, and that two periods with different codes never show the identical icon.

**Acceptance Scenarios**:

1. **Given** a forecast period whose SMHI `symbol_code` is known, **When** the viewer looks at its icon, **Then** the icon shown is the one specifically assigned to that code — not shared with a different code that today gets collapsed into the same bucket.
2. **Given** two forecast periods with different SMHI `symbol_code` values that today render identically (e.g. "moderate rain showers" vs. "heavy rain showers"), **When** the viewer compares their icons, **Then** the icons are visually distinguishable from each other.
3. **Given** the full set of 27 codes, **When** each is looked up, **Then** every one resolves to a specific icon — none fall back to a generic/blank placeholder.

---

### User Story 2 - Everything else keeps working when SMHI's own code isn't available (Priority: P2)

A viewer looks at a period sourced from somewhere other than SMHI's own forecast (e.g. Open-Meteo, MET Norway, or an observed/historical reading with no forecast symbol at all) and still sees a sensible, appropriately-detailed icon — just not necessarily one of the full 27, since the underlying data doesn't support that level of detail.

**Why this priority**: A guardrail on User Story 1 — expanding icon detail for SMHI-code periods must not break or degrade the existing experience for the app's other, already-supported data sources.

**Independent Test**: For a period with no SMHI `symbol_code` (a different source, or an observed reading), confirm an icon still renders, using today's existing logic, mapped onto the closest matching icon in the new set.

**Acceptance Scenarios**:

1. **Given** a period sourced from a provider other than SMHI's own forecast symbol, **When** the viewer looks at its icon, **Then** an icon still renders, chosen by today's existing (amount/cloud-based) logic — not blank, not an error.
2. **Given** an observed (historical) reading with no forecast symbol code at all, **When** the viewer looks at its icon, **Then** behavior is unchanged from today.

---

### User Story 3 - The actual icon artwork can be replaced later without redoing the mapping (Priority: P3)

The user plans to keep refining the visual design of the 27 icons (multiple reference versions already supplied). They want to swap in a new set of icon graphics later without anyone needing to re-derive which graphic belongs to which of the 27 situations.

**Why this priority**: Named explicitly by the user ("I will probably re-create the icons... prepare for it") — lower priority than the icons actually working, but important to avoid throwaway effort on the next revision.

**Independent Test**: Replace the underlying icon artwork for one or more of the 27 codes and confirm the correct new artwork appears for that code everywhere it's used, without needing to touch the code-to-situation mapping itself.

**Acceptance Scenarios**:

1. **Given** the artwork for a given code is replaced, **When** the app is next viewed, **Then** every place that code's icon appears shows the new artwork, without any change to which code maps to which weather situation.

---

### Edge Cases

- What happens for a source that provides its own symbol/condition classification but not SMHI's specific numbering (e.g. MET Norway)? It's treated as "no SMHI symbol_code" for this feature — User Story 2's fallback applies, unchanged from today's existing cross-source handling.
- What happens if SMHI itself ever returns a code outside 1-27, or none at all for a period that should have one? Falls back the same way as "no symbol_code," per User Story 2 — never a blank/broken icon.
- What happens to the low-confidence rain-icon guard (a period isn't shown as rain when its own chance-of-rain is very low, added in an earlier feature)? Unaffected — that guard operates before icon selection and continues to apply the same way regardless of how many distinct rain icons exist afterward.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST represent each of SMHI's 27 documented `symbol_code` values (1 through 27) as its own distinct icon.
- **FR-002**: For any forecast period whose SMHI `symbol_code` is known, the system MUST select the icon assigned to that exact code.
- **FR-003**: For any period without a known SMHI `symbol_code` (a different data source, or an observed/historical reading), the system MUST continue to select an icon using today's existing logic, choosing the closest match among the 27 icons.
- **FR-004**: No forecast period MUST ever render without an icon (blank/missing) as a result of this change.
- **FR-005**: The mapping from a SMHI code to its situation description (e.g. "code 9 = moderate rain showers") MUST be maintained independently of the specific graphic used to depict it, so the graphic for any code can be replaced without changing which code it represents.
- **FR-006**: The low-confidence rain-icon guard and any other existing icon-selection rule that runs before code-based lookup MUST continue to apply unchanged.

### Key Entities

- **SMHI symbol code**: One of 27 integer values (1-27) SMHI's forecast API supplies per period, each with a fixed, documented meaning (e.g. "8 = Light rain showers").
- **Weather icon**: A visual asset representing one specific situation — under this feature, 27 of them correspond 1:1 with SMHI's own codes; a smaller existing set continues to serve situations without a matching SMHI code.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a representative set of forecast periods covering all 27 SMHI symbol codes, 100% render an icon distinct from every other code's icon.
- **SC-002**: For a representative set of periods without an SMHI symbol code, 100% still render a sensible icon, matching today's existing behavior.
- **SC-003**: Replacing the artwork for any one code changes only that code's appearance, verified by confirming no other code's rendered icon changes.

## Assumptions

- The user's supplied reference images (`docs/logos/smhi_symbols.png`, superseded by `docs/logos/smhi_symbols_ver2.png`) describe the intended situation-to-icon groupings and visual style, but are treated as a working draft — the user has said they'll likely revise the artwork again, so the final graphic files are not fixed by this spec.
- "27 different icons" means 27 visually distinct graphics, not necessarily 27 entirely unrelated designs — the reference images themselves reuse a consistent visual language (cloud shapes, rain/snow marks, a thunderbolt) varied by intensity and precipitation type, and the final artwork may do the same.
- Scope is limited to icon selection for weather conditions; it does not change how any provider (SMHI, MET Norway, Open-Meteo) fetches or reports its underlying data.
- This feature affects every place in the app that already shows a per-period weather icon (dashboard timeline, Today card, weekly strip, Details view, graph tooltips) — none are being newly added or removed by this feature; existing icon placements simply become more specific when a SMHI code is available.
