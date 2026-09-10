"""Crop the 25 "Vadergubben" character cells out of the user-supplied reference sheet.

Unlike docs/logos/split_symbols_ver6.py's source (a checkerboard-background sheet needing
flood-fill + edge-feathering to recover real transparency), this sheet already has a clean alpha
channel: ~68% of pixels are fully transparent (alpha < 10) and ~28% are fully opaque (alpha > 200),
with only a thin anti-aliased edge band in between. So this script only needs to crop each cell at
its known pixel bounds and autotrim to the character's own alpha>0 bounding box
(061-cartoon-weather-companion, research.md SS1-SS3).

Row order (top to bottom) is precipitation category; column order (left to right) is temperature
band. Both match docs/weathericons/vaderikoner-promptguide.md's matrix and spec.md's Key Entities
exactly, so cell (row, col) maps directly to (precip[row], band[col]) with no reordering.
"""

from pathlib import Path

import numpy as np
from PIL import Image

SOURCE = Path(__file__).parent / "b883b079-47e5-41c1-99b5-1dce1b1449e7.png"
OUT_DIR = Path(__file__).parent.parent.parent / "src" / "assets" / "weather-characters"

# Measured directly from the 1536x1024 source sheet (research.md SS2) via content-density
# profiling: summing alpha>40 pixel counts per row/column and locating the low-density gaps that
# separate the header row / label column from the 5x5 grid of character cells.
ROW_BOUNDS = [
    (94, 277),   # dry (Torrt)
    (284, 470),  # rain (Regn)
    (477, 651),  # thunder (Aska)
    (668, 841),  # sleet (Slask)
    (846, 1008),  # snow (Sno)
]
COL_BOUNDS = [
    (271, 467),   # frozen (Extremkallt, <-20C)
    (524, 693),   # cold (Kallt, -20 to 0C)
    (772, 933),   # mild (Milt, 0-15C)
    (1002, 1197),  # warm (Varmt, 15-25C)
    (1256, 1467),  # hot (Hett, >25C)
]

PRECIP_ORDER = ["dry", "rain", "thunder", "sleet", "snow"]
BAND_ORDER = ["frozen", "cold", "mild", "warm", "hot"]


def autotrim(im: Image.Image) -> Image.Image:
    arr = np.array(im)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0:
        return im
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def extract_character(sheet: np.ndarray, row: int, col: int) -> Image.Image:
    y0, y1 = ROW_BOUNDS[row]
    x0, x1 = COL_BOUNDS[col]
    cell = sheet[y0:y1, x0:x1].copy()
    im = Image.fromarray(cell, mode="RGBA")
    return autotrim(im)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet = np.array(Image.open(SOURCE).convert("RGBA"))

    for row, precip in enumerate(PRECIP_ORDER):
        for col, band in enumerate(BAND_ORDER):
            character = extract_character(sheet, row, col)
            filename = f"character_{precip}_{band}.png"
            character.save(OUT_DIR / filename)
            print(f"wrote {filename} ({character.size[0]}x{character.size[1]})")


if __name__ == "__main__":
    main()
