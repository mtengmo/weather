"""
split_icons.py

Splittar väderikon-sprite-sheets (2 rader: day/night, N kolumner enligt
sheet-manifest.json) till enskilda transparenta PNG-ikoner.

Förutsättningar:
    pip install pillow numpy scipy

Mappstruktur som förväntas:
    ./sheets/               <- lägg de genererade sprite-sheet-PNG:erna här
                                (samma filnamn som "input_file" i manifestet)
    ./sheet-manifest.json   <- manifestet (från guiden)
    ./icons_split/          <- output, skapas automatiskt

Kör:
    python split_icons.py
    python split_icons.py --sheets-dir mina_sheets --out-dir mina_ikoner
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

WHITE_THRESHOLD = 245      # pixel räknas som "bakgrundsfärg" om R,G,B >= detta
ALPHA_VARIATION_MIN = 2    # antal unika alfa-värden som krävs för att räknas som "riktig" transparens
INSET_FRAC = 0.04          # krymp varje cell inåt med denna andel innan vi letar innehåll
                            # (skydd mot att fånga grannens pixlar när marginalen är tight)
CONTENT_PADDING_PX = 8     # padding runt det hittade innehållet i slutgiltig beskärning


def remove_background(img: Image.Image) -> Image.Image:
    """Gör bakgrunden transparent, men bara den delen av bakgrunden som är
    SAMMANHÄNGANDE med bildens hörn — så vita/ljusa delar av själva
    karaktären (snö, is, moln) inte råkar bli genomskinliga."""
    img = img.convert("RGBA")
    arr = np.array(img)
    is_bg_color = np.all(arr[:, :, :3] >= WHITE_THRESHOLD, axis=2)

    labeled, _ = ndimage.label(is_bg_color)
    h, w = arr.shape[:2]
    corner_coords = [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]
    corner_labels = {labeled[y, x] for y, x in corner_coords if is_bg_color[y, x]}
    corner_labels.discard(0)

    bg_mask = np.isin(labeled, list(corner_labels))
    arr[bg_mask, 3] = 0
    return Image.fromarray(arr, "RGBA")


def tight_crop(img: Image.Image, padding: int = CONTENT_PADDING_PX) -> Image.Image | None:
    """Beskär till innehållets bounding box (alpha > 10) + liten padding.
    Returnerar None om cellen är helt tom (inget innehåll hittat)."""
    arr = np.array(img)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 10)
    if len(xs) == 0:
        return None
    x0 = max(int(xs.min()) - padding, 0)
    x1 = min(int(xs.max()) + padding, img.width)
    y0 = max(int(ys.min()) - padding, 0)
    y1 = min(int(ys.max()) + padding, img.height)
    return img.crop((x0, y0, x1, y1))


def verify_alpha(img: Image.Image) -> bool:
    if img.mode != "RGBA":
        return False
    alpha_vals = set(np.array(img)[:, :, 3].flatten().tolist())
    return len(alpha_vals) >= ALPHA_VARIATION_MIN


def split_sheet(input_path: Path, columns: list[str], band: str, rows: list[str], out_dir: Path):
    if not input_path.exists():
        print(f"  ⚠️  Hittar inte {input_path}, hoppar över")
        return

    img = remove_background(Image.open(input_path))
    w, h = img.size
    col_w = w / len(columns)
    row_h = h / len(rows)

    for r, row_name in enumerate(rows):
        for c, typ in enumerate(columns):
            # Nominell cell
            x0, y0 = c * col_w, r * row_h
            x1, y1 = (c + 1) * col_w, (r + 1) * row_h
            # Krymp inåt lite för att undvika att fånga grannens pixlar
            ix = (x1 - x0) * INSET_FRAC
            iy = (y1 - y0) * INSET_FRAC
            cell_box = (round(x0 + ix), round(y0 + iy), round(x1 - ix), round(y1 - iy))

            cell = img.crop(cell_box)
            cropped = tight_crop(cell)
            out_name = f"weather_{typ}_{row_name}_{band}.png"

            if cropped is None:
                print(f"  ❌ {out_name}: inget innehåll hittat i cellen — kontrollera manuellt")
                continue

            cropped.save(out_dir / out_name)
            status = "✅" if verify_alpha(cropped) else "⚠️  saknar alfa-variation, kontrollera manuellt"
            print(f"  {status} {out_name}  ({cropped.width}x{cropped.height})")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", default="sheet-manifest.json")
    parser.add_argument("--sheets-dir", default="sheets")
    parser.add_argument("--out-dir", default="icons_split")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        print(f"Hittar inte manifestet: {manifest_path}")
        sys.exit(1)

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    sheets_dir = Path(args.sheets_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    rows = manifest.get("rows", ["day", "night"])

    for sheet in manifest["sheets"]:
        print(f"Splittar {sheet['input_file']} ...")
        split_sheet(
            sheets_dir / sheet["input_file"],
            sheet["columns"],
            sheet["band"],
            rows,
            out_dir,
        )

    total_expected = sum(len(s["columns"]) for s in manifest["sheets"]) * len(rows)
    total_written = len(list(out_dir.glob("*.png")))
    print(f"\nKlart. {total_written}/{total_expected} ikoner skrivna till {out_dir}/")
    if total_written < total_expected:
        print("Vissa filer saknas eller flaggades — se ⚠️/❌ ovan.")


if __name__ == "__main__":
    main()
