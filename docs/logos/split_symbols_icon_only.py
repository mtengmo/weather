from PIL import Image, ImageChops
import os

SRC = r"C:\GitRepos\weather\docs\logos\smhi_symbols_ver2.png"
OUT_DIR = r"C:\GitRepos\weather\docs\logos\smhi_symbols_ver2_icons"

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
# Region (within each cell) that contains the number badge, found by inspecting darkness/
# saturation profiles: numerals (including 2-digit ones like "10"/"27") sit within roughly
# x:0-50, y:0-38 and the icon artwork itself never starts before x~60 or y~15 in this sheet.
NUMERAL_BOX = (0, 0, 58, 45)
# Icon artwork occupies roughly the top 60% of each cell; captions/title start below that
# (confirmed via a row-wise color-saturation profile — signal drops to near zero around
# this row and stays there until the bold caption text begins).
ICON_BOTTOM_FRACTION = 0.61

os.makedirs(OUT_DIR, exist_ok=True)

im = Image.open(SRC).convert("RGB")
w, h = im.size
cell_w = w / COLS
cell_h = h / ROWS

WHITE = (255, 255, 255)


def autotrim(icon: Image.Image, pad: int = 6) -> Image.Image:
    bg = Image.new("RGB", icon.size, WHITE)
    diff = ImageChops.difference(icon, bg)
    bbox = diff.getbbox()
    if bbox is None:
        return icon
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(icon.width, right + pad)
    bottom = min(icon.height, bottom + pad)
    return icon.crop((left, top, right, bottom))


idx = 0
for r in range(ROWS):
    for c in range(COLS):
        left = round(c * cell_w)
        right = round((c + 1) * cell_w)
        top = round(r * cell_h)
        bottom = round((r + 1) * cell_h)
        cell = im.crop((left, top, right, bottom))

        # Paint over the number badge so it isn't part of the icon artwork.
        nb_left, nb_top, nb_right, nb_bottom = NUMERAL_BOX
        for y in range(nb_top, min(nb_bottom, cell.height)):
            for x in range(nb_left, min(nb_right, cell.width)):
                cell.putpixel((x, y), WHITE)

        icon_bottom = round(cell.height * ICON_BOTTOM_FRACTION)
        icon_only = cell.crop((0, 0, cell.width, icon_bottom))
        icon_only = autotrim(icon_only)

        name = NAMES[idx]
        icon_only.save(os.path.join(OUT_DIR, f"{name}.png"))
        idx += 1

print(f"Wrote {idx} icon-only crops to {OUT_DIR}")
