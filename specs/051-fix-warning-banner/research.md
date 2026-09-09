# Research: Fix Warning Banner Colors to Match Real Severity

## 1. Root cause, precisely

**Decision**: Two compounding issues, both in the app's assumption of `CLASS_1/2/3` codes that don't match SMHI's real `YELLOW`/`ORANGE`/`RED`:
1. `SEVERITY_ORDER` (`weatherApi.ts`) has no entry for `YELLOW`/`ORANGE`/`RED`, so `severityRank` returns `-1` for all of them (tied, and lower than `MESSAGE`'s `0`).
2. The CSS's per-level color rules (`index.css`) are keyed `.warning-level-class_1/2/3`, which never match a real `warning-level-yellow`/`-orange`/`-red` class — so a real warning falls through to the *base* `.warning-banner`/`.warning-banner-summary` styling, which is itself unconditionally red-tinted (`var(--error-bg)`, `var(--error-border)`, `var(--error-text)`) with only a thin left-border strip meant to vary by level. The result: every color-coded warning today renders as a solid red card, with severity communicated by nothing at all.

**Rationale**: Confirmed by reading both files directly alongside the live feed's actual codes.

## 2. Fix shape

**Decision**:
- Update `SEVERITY_ORDER` to `{ MESSAGE: 0, YELLOW: 1, ORANGE: 2, RED: 3, CLASS_1: 1, CLASS_2: 2, CLASS_3: 3 }` — recognizes both the real current codes and the old assumed ones defensively (spec Assumptions), without guessing at any other future code.
- Replace the base `.warning-banner`/`.warning-banner-summary` unconditional red styling with a neutral default (matching the existing `--border`/`--text-muted` tokens used elsewhere in the app), and give `.warning-level-yellow/orange/red` (plus the existing `_class_1/2/3` aliases) their own full background+border+text treatment — not just a border-strip accent — so the whole card visibly reflects its real severity, and an unrecognized code lands on the neutral default rather than red (FR-003).

**Rationale**: A border-strip-only accent proved insufficient in practice — the dominant visual signal (full card background/text) was the fixed red, which is exactly what makes any warning "look red" regardless of its real level. Fixing only the missing class name without also decoupling the base styling from red would still leave `MESSAGE` (routed elsewhere anyway, 048) and any future unrecognized code looking alarming.

## 3. Colors chosen

**Decision**: Yellow `#eab308`, Orange `#f97316`, Red `#dc2626` (unchanged from the existing, correctly-chosen `class_1/2/3` border colors) — each now applied as a soft ~12% background tint plus the same border color, text staying the app's normal `--text` token rather than a fixed red. The neutral default (no match) keeps a `--text-muted`-bordered, unfilled treatment, matching how `MESSAGE`-level already looked before this fix (never alarming).

**Rationale**: Reuses colors already chosen and already correct for the *strip* — only widens their application and fixes the class names/severity map they're keyed on.
