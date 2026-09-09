"""Crop the 27 SMHI symbol icons out of symbols_logos_ver6.png.

The source sheet is a 5x6 grid of numbered cells with no real alpha channel:
its "transparent" background is a baked-in checkerboard. This script removes
that checkerboard via flood fill from each cell's corners (so it can't leak
into a legitimately light/white icon interior enclosed by a darker outline),
clears the numeral label and any bleed from the neighboring cell via
connected-component analysis, feathers the resulting hard edge into a soft,
decontaminated alpha (the source art was anti-aliased against the checker,
not against real transparency, so a hard cutoff leaves a grey/white fringe),
then autotrims each crop to its content (047-update-27-smhi, research.md).
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

SOURCE = Path(__file__).parent / "symbols_logos_ver6.png"
OUT_DIR = Path(__file__).parent / "symbols_ver6_icons"

GRID_COLS = 5
GRID_ROWS = 6
CELL_W = 1024 / GRID_COLS
CELL_H = 1536 / GRID_ROWS

# A numeral component (1-2 digits) always lands fully inside this top-left zone and is small;
# a real icon-detail component (snowflake, raindrop, ice cube) drawn near the top-left never is,
# per research.md's per-code component survey. Anything else in the cell — including components
# in this zone that don't meet BOTH conditions — is real icon content and must be kept.
NUMERAL_ZONE_MAX_X = 150
NUMERAL_ZONE_MAX_Y = 140
NUMERAL_MAX_AREA = 900

# code -> output filename, matching src/components/smhiSymbolIcons.ts exactly.
FILENAMES = {
    1: "01-clear.png",
    2: "02-nearly-clear.png",
    3: "03-variable-cloudiness.png",
    4: "04-halfclear.png",
    5: "05-cloudy.png",
    6: "06-overcast.png",
    7: "07-fog.png",
    8: "08-light-rain-showers.png",
    9: "09-moderate-rain-showers.png",
    10: "10-heavy-rain-showers.png",
    11: "11-thunderstorm.png",
    12: "12-light-sleet-showers.png",
    13: "13-moderate-sleet-showers.png",
    14: "14-heavy-sleet-showers.png",
    15: "15-light-snow-showers.png",
    16: "16-moderate-snow-showers.png",
    17: "17-heavy-snow-showers.png",
    18: "18-light-rain.png",
    19: "19-moderate-rain.png",
    20: "20-heavy-rain.png",
    21: "21-thunder.png",
    22: "22-light-sleet.png",
    23: "23-moderate-sleet.png",
    24: "24-heavy-sleet.png",
    25: "25-light-snowfall.png",
    26: "26-moderate-snowfall.png",
    27: "27-heavy-snowfall.png",
}


def cell_bounds(code: int) -> tuple[int, int, int, int]:
    index = code - 1
    row, col = index // GRID_COLS, index % GRID_COLS
    x0, y0 = round(col * CELL_W), round(row * CELL_H)
    x1, y1 = round((col + 1) * CELL_W), round((row + 1) * CELL_H)
    return x0, y0, x1, y1


def is_background_candidate(rgb: np.ndarray) -> np.ndarray:
    lo = rgb.min(axis=2)
    hi = rgb.max(axis=2)
    return (lo > 225) & (hi - lo < 10)


def label_components(fg: np.ndarray) -> list[dict]:
    """4-connected component labeling over a boolean foreground mask (no scipy available)."""
    h, w = fg.shape
    visited = np.zeros((h, w), dtype=bool)
    comps = []
    for y in range(h):
        for x in range(w):
            if fg[y, x] and not visited[y, x]:
                visited[y, x] = True
                q = deque([(x, y)])
                pixels = [(x, y)]
                while q:
                    cx, cy = q.popleft()
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and fg[ny, nx] and not visited[ny, nx]:
                            visited[ny, nx] = True
                            q.append((nx, ny))
                            pixels.append((nx, ny))
                xs = [p[0] for p in pixels]
                ys = [p[1] for p in pixels]
                comps.append({"pixels": pixels, "area": len(pixels), "bbox": (min(xs), min(ys), max(xs), max(ys))})
    return comps


def flood_fill_background(rgb: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    candidate = is_background_candidate(rgb)
    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if candidate[y, x] and not visited[y, x]:
            visited[y, x] = True
            q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx] and candidate[ny, nx]:
                visited[ny, nx] = True
                q.append((nx, ny))
    return visited


EDGE_BAND = 2  # pixels of hard-edge alpha=255 to treat as "near background" and feather
CORE_SEARCH_RADIUS = 6  # how far to look for a "clean" interior color to feather toward


def _nearest_source_colors(shape: tuple[int, int], sources: list[tuple[int, int]], colors: np.ndarray,
                            within: np.ndarray, max_dist: int) -> np.ndarray:
    """Multi-source BFS: for every True pixel in `within`, find the nearest `sources` pixel
    (by 4-connected steps, only stepping through `within`) and return that source's color.
    Pixels with no source within `max_dist` keep color (0, 0, 0) and should be ignored by the
    caller (check the companion 'found' mask)."""
    h, w = shape
    nearest_color = np.zeros((h, w, 3), dtype=np.float64)
    found = np.zeros((h, w), dtype=bool)
    dist = np.full((h, w), -1, dtype=np.int32)
    q = deque()
    for x, y in sources:
        if dist[y, x] == -1:
            dist[y, x] = 0
            found[y, x] = True
            nearest_color[y, x] = colors[y, x]
            q.append((x, y))
    while q:
        x, y = q.popleft()
        d = dist[y, x]
        if d >= max_dist:
            continue
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and within[ny, nx] and dist[ny, nx] == -1:
                dist[ny, nx] = d + 1
                found[ny, nx] = True
                nearest_color[ny, nx] = nearest_color[y, x]
                q.append((nx, ny))
    return nearest_color, found


def feather_edges(cell: np.ndarray, alpha: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Turn the hard alpha=0/255 boundary into a soft, color-decontaminated edge.

    The source sheet's anti-aliasing blended each icon's true color against the checkerboard,
    not against real transparency, so pixels right at our hard cutoff are a mix of icon color and
    background color — visible as a grey/white fringe on any non-checker background. For each
    such edge pixel we solve `observed = alpha*fg + (1-alpha)*bg` for alpha (using the nearest
    already-transparent pixel's own color as `bg`, and the nearest "clean interior" opaque pixel's
    color as `fg`), then un-premultiply to recover the true color at that estimated alpha.
    """
    h, w, _ = cell.shape
    colors = cell.astype(np.float64)
    opaque = alpha == 255
    transparent = ~opaque

    # "Core" pixels: opaque and not within EDGE_BAND (BFS hops) of a transparent pixel.
    _, near_transparent = _nearest_source_colors(
        (h, w), list(zip(*np.where(transparent)[::-1])), colors, opaque, EDGE_BAND
    )
    edge_mask = opaque & near_transparent
    core_mask = opaque & ~edge_mask

    if not edge_mask.any():
        return cell, alpha

    bg_colors, bg_found = _nearest_source_colors(
        (h, w), list(zip(*np.where(transparent)[::-1])), colors, np.ones((h, w), dtype=bool), 4
    )
    fg_colors, fg_found = _nearest_source_colors(
        (h, w), list(zip(*np.where(core_mask)[::-1])), colors, opaque, CORE_SEARCH_RADIUS
    )

    new_cell = cell.copy()
    new_alpha = alpha.copy()
    ys, xs = np.where(edge_mask)
    for y, x in zip(ys, xs):
        if not fg_found[y, x] or not bg_found[y, x]:
            continue  # no reference available — leave this pixel hard-edged
        observed = colors[y, x]
        bg_c = bg_colors[y, x]
        fg_c = fg_colors[y, x]
        diff = fg_c - bg_c
        denom = float(np.dot(diff, diff))
        if denom < 1e-3:
            continue  # background and foreground reference are indistinguishable here
        alpha_est = float(np.dot(observed - bg_c, diff)) / denom
        alpha_est = max(0.0, min(1.0, alpha_est))
        if alpha_est < 0.08:
            new_alpha[y, x] = 0
            continue
        recovered = bg_c + (observed - bg_c) / max(alpha_est, 0.25)
        new_cell[y, x] = np.clip(recovered, 0, 255).astype(np.uint8)
        new_alpha[y, x] = round(alpha_est * 255)

    return new_cell, new_alpha


def autotrim(im: Image.Image) -> Image.Image:
    arr = np.array(im)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0:
        return im
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def extract_icon(sheet_rgb: np.ndarray, code: int) -> Image.Image:
    x0, y0, x1, y1 = cell_bounds(code)
    cell = sheet_rgb[y0:y1, x0:x1].copy()
    h, w, _ = cell.shape

    background_mask = flood_fill_background(cell)
    foreground = ~background_mask

    alpha = np.full((h, w), 255, dtype=np.uint8)
    alpha[background_mask] = 0

    comps = label_components(foreground)
    largest = max(comps, key=lambda c: c["area"])
    for comp in comps:
        if comp is largest:
            continue
        bx0, by0, bx1, by1 = comp["bbox"]
        is_numeral = (
            bx1 < NUMERAL_ZONE_MAX_X and by1 < NUMERAL_ZONE_MAX_Y and comp["area"] < NUMERAL_MAX_AREA
        )
        # A component (other than the main icon body and the numeral) that touches the cell's
        # own top edge is a sliced fragment bleeding down from the icon drawn in the cell above
        # (confirmed for code 15, whose neighbor above overflows its own cell boundary) — real
        # icon detail (raindrops, ice cubes) instead touches the *bottom* edge, never the top.
        is_bleed_from_above = by0 == 0
        if is_numeral or is_bleed_from_above:
            for x, y in comp["pixels"]:
                alpha[y, x] = 0

    cell, alpha = feather_edges(cell, alpha)

    rgba = np.dstack([cell, alpha])
    im = Image.fromarray(rgba, mode="RGBA")
    return autotrim(im)


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    sheet = np.array(Image.open(SOURCE).convert("RGB"))

    for code, filename in FILENAMES.items():
        icon = extract_icon(sheet, code)
        icon.save(OUT_DIR / filename)
        print(f"wrote {filename} ({icon.size[0]}x{icon.size[1]})")


if __name__ == "__main__":
    main()
