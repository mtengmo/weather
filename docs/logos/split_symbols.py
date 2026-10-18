from PIL import Image
import os

SRC = r"C:\GitRepos\weather\docs\logos\smhi_symbols_ver2.png"
OUT_DIR = r"C:\GitRepos\weather\docs\logos\smhi_symbols_ver2_split"

NAMES = [
    "01-clear",
    "02-nearly-clear",
    "03-variable-cloudiness",
    "04-halfclear",
    "05-cloudy",
    "06-overcast",
    "07-fog",
    "08-light-rain-showers",
    "09-moderate-rain-showers",
    "10-heavy-rain-showers",
    "11-thunderstorm",
    "12-light-sleet-showers",
    "13-moderate-sleet-showers",
    "14-heavy-sleet-showers",
    "15-light-snow-showers",
    "16-moderate-snow-showers",
    "17-heavy-snow-showers",
    "18-light-rain",
    "19-moderate-rain",
    "20-heavy-rain",
    "21-thunder",
    "22-light-sleet",
    "23-moderate-sleet",
    "24-heavy-sleet",
    "25-light-snowfall",
    "26-moderate-snowfall",
    "27-heavy-snowfall",
]

COLS = 3
ROWS = 9

os.makedirs(OUT_DIR, exist_ok=True)

im = Image.open(SRC)
w, h = im.size
cell_w = w / COLS
cell_h = h / ROWS

idx = 0
for r in range(ROWS):
    for c in range(COLS):
        left = round(c * cell_w)
        right = round((c + 1) * cell_w)
        top = round(r * cell_h)
        bottom = round((r + 1) * cell_h)
        crop = im.crop((left, top, right, bottom))
        name = NAMES[idx]
        crop.save(os.path.join(OUT_DIR, f"{name}.png"))
        idx += 1

print(f"Wrote {idx} crops to {OUT_DIR}")
print(f"Source size: {w}x{h}, cell size: {cell_w:.1f}x{cell_h:.1f}")
