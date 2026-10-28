"""Copies the web weather artwork (src/assets/weather-icons-v2/*.png) into the Android
res/drawable-nodpi folder, renaming '-' to '_' (Android resource naming).

Usage:
    python android/scripts/sync_weather_icons.py          # copy new/changed files
    python android/scripts/sync_weather_icons.py --check  # exit 1 if any file is missing or differs
"""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src" / "assets" / "weather-icons-v2"
DST = ROOT / "android" / "app" / "src" / "main" / "res" / "drawable-nodpi"


def main() -> int:
    check = "--check" in sys.argv[1:]
    stale: list[str] = []
    for src in sorted(SRC.glob("*.png")):
        name = src.name.replace("-", "_")
        dst = DST / name
        if dst.exists() and dst.read_bytes() == src.read_bytes():
            continue
        stale.append(name)
        if not check:
            shutil.copyfile(src, dst)
    if check:
        if stale:
            print("Stale or missing weather icons:\n  " + "\n  ".join(stale))
            return 1
        print("Weather icons are up to date.")
        return 0
    print(f"Copied {len(stale)} weather icon(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
