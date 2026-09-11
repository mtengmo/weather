"""Shrink the 124 generated character-artwork icons in-place.

The app only ever displays these at 28-40 CSS px (Today card, timeline, Details table, 7-day
strip), but the split sheets produce full-detail illustrations averaging ~344x471px (~257 KB
each, ~32 MB total) — 10-20x larger than actually needed even accounting for high-DPI screens.

This resizes each to a 160px max dimension (generous headroom for 3x-DPI at a 40px display size)
and re-saves as a 128-color palette PNG (RGBA alpha preserved) — visually indistinguishable from
the full-detail original at the sizes these actually render at, but a small fraction of the size.

Run once, in-place:
    python resize_icons.py
    python resize_icons.py --dir ../../src/assets/weather-icons-v2 --max-dimension 160
"""

import argparse
from pathlib import Path

from PIL import Image

DEFAULT_DIR = Path(__file__).parent.parent.parent / "src" / "assets" / "weather-icons-v2"
MAX_DIMENSION = 160
PALETTE_COLORS = 128


def shrink(path: Path, max_dimension: int, colors: int) -> tuple[int, int]:
    original_size = path.stat().st_size
    im = Image.open(path).convert("RGBA")
    im.thumbnail((max_dimension, max_dimension), Image.LANCZOS)
    quantized = im.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
    quantized.save(path, optimize=True)
    return original_size, path.stat().st_size


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir", default=str(DEFAULT_DIR))
    parser.add_argument("--max-dimension", type=int, default=MAX_DIMENSION)
    parser.add_argument("--colors", type=int, default=PALETTE_COLORS)
    args = parser.parse_args()

    target_dir = Path(args.dir)
    files = sorted(target_dir.glob("*.png"))
    total_before = 0
    total_after = 0

    for path in files:
        before, after = shrink(path, args.max_dimension, args.colors)
        total_before += before
        total_after += after
        print(f"{path.name}: {before/1000:.1f}KB -> {after/1000:.1f}KB")

    print(f"\n{len(files)} files: {total_before/1e6:.2f}MB -> {total_after/1e6:.2f}MB")


if __name__ == "__main__":
    main()
