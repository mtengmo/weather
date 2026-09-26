"""One-off fixer: escapes bare apostrophes and double quotes inside <string> element bodies of the
Android strings.xml files (aapt2 requires them escaped), and removes any manual localeConfig
attribute from the manifest. Idempotent."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "app/src/main"
BACKSLASH = chr(92)

LINE = re.compile(r'^(\s*<string name="[^"]+">)(.*)(</string>)$')


def escape_body(body: str) -> str:
    out = []
    for i, ch in enumerate(body):
        prev = body[i - 1] if i > 0 else ""
        if ch in ("'", '"') and prev != BACKSLASH:
            out.append(BACKSLASH)
        out.append(ch)
    return "".join(out)


for rel in ("res/values/strings.xml", "res/values-sv/strings.xml"):
    path = ROOT / rel
    lines = path.read_text(encoding="utf-8").split("\n")
    fixed = []
    for line in lines:
        m = LINE.match(line)
        if m:
            line = m.group(1) + escape_body(m.group(2)) + m.group(3)
        fixed.append(line)
    path.write_text("\n".join(fixed), encoding="utf-8")

manifest = ROOT / "AndroidManifest.xml"
text = manifest.read_text(encoding="utf-8")
text = text.replace('\n        android:localeConfig="@xml/_generated_res_locale_config">', ">")
manifest.write_text(text, encoding="utf-8")
print("fixed")
