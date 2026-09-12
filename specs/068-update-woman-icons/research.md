# Phase 0 Research: Refresh the Woman Character's Icon Artwork (Sheets 1-6)

## §1 — Confirming the affected file count: 72, not 124 or 36

**Finding**: `sheet-manifest.json`'s entries for sheets 1-6 each cover one temperature band
(frozen/cold/nearzero/mild/warm/hot) across the same six weather-type columns — `clear`,
`nearly-clear`, `variable`, `cloudy`, `overcast`, `fog` — with 2 rows (day/night) per sheet. That's
6 columns × 2 rows = 12 files per sheet, × 6 sheets = **72 files** total for sheets 1-6, out of the
full icon set's 124. The remaining 52 files (sheets 7-19: rain, thunder/sleet, snow) must be left
untouched (FR-003/SC-002).

## §2 — Scoping the re-split to sheets 1-6 only

**Finding**: `split_icons.py` always processes every sheet listed in `sheet-manifest.json` in one
run — it has no built-in way to process a subset. Re-running it unmodified against
`docs/weathericons/` (as 067 already did) would regenerate all 124 icons, including the 52 that
correspond to unchanged sheets 7-19.

**Decision**: Run the full script as before (`python split_icons.py --sheets-dir . --out-dir
icons_split`), but only copy the 72 output files whose names correspond to sheets 1-6's six
columns × day/night into `src/assets/weather-icons-v2/`, leaving the other 52 regenerated-but-
discarded output files unused.

**Rationale**: Running the script in full is no more expensive than a partial run (a fast,
one-time local script over 19 small PNGs), and copying only the intended subset via an explicit
filename list is simpler and safer than proving byte-identity for the other 52 files or editing
the manifest to exclude sheets 7-19.

**Alternatives considered**: Temporarily editing `sheet-manifest.json` to list only sheets 1-6 —
rejected as unnecessary extra risk (a manifest edit that must be reverted afterward) for no real
benefit over just being selective about which output files get copied.

## §3 — Re-applying the size-optimization step, scoped the same way

**Finding**: 067-fix-rain-brief-icons already established that `split_icons.py`'s raw output is
full-sheet-resolution (100s of KB per file) and must be run through `resize_icons.py` (160px max
dimension, 128-color palette) to reach the ~5-15KB per file the shipped set already uses.
`resize_icons.py`'s CLI always operates on every `*.png` in its target directory
(`target_dir.glob("*.png")`) — no per-file selection built in.

**Decision**: Copy the 72 new raw files into `src/assets/weather-icons-v2/` first, then shrink
only those 72 (by reusing `resize_icons.py`'s `shrink()` function against an explicit file list, a
short one-off invocation rather than its default whole-directory CLI mode) — not the other 52
already-optimized files, which would otherwise get needlessly re-quantized and re-saved (a
harmless-but-unnecessary write, and one that would break SC-002's "byte-for-byte unchanged"
guarantee for files that shouldn't be touched at all).

**Rationale**: Scoping the shrink step the same way as the copy step keeps both steps consistent
with FR-003's "targeted refresh of sheets 1-6 only" — nothing outside that set is written to,
re-encoded, or even re-saved identically.
