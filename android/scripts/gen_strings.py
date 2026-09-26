"""One-off generator for T025/T026 — ports src/i18n/en.ts and sv.ts key/value pairs into
Android strings.xml. Not part of the app; run once and commit the generated resource files.
Re-run if the web app's i18n files change, to keep the ports in sync (FR-009).
"""
import re
import xml.sax.saxutils as sx
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def parse_ts(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    body = text[text.index("{") : text.rindex("}")]
    # Match "key": "value"  or  "key":\n    "value" (multi-line string concatenation via +)
    pairs: dict[str, str] = {}
    # Tokenize by finding "key": then a JS string literal (possibly split across lines with
    # no `+` in this file — checked: all multi-line values are a single quoted string).
    pattern = re.compile(r'"([a-zA-Z0-9_.\-]+)"\s*:\s*"((?:[^"\\]|\\.)*)"', re.DOTALL)
    for m in pattern.finditer(body):
        key, value = m.group(1), m.group(2)
        value = value.replace("\\n", "\n").replace('\\"', '"')
        pairs[key] = value
    return pairs


def android_name(key: str) -> str:
    return key.replace(".", "_").replace("-", "_")


def to_android_value(value: str) -> str:
    # {{name}} -> %1$s, %2$s... in order of first appearance within this value.
    placeholders = []

    def repl(m: re.Match) -> str:
        name = m.group(1)
        if name not in placeholders:
            placeholders.append(name)
        return f"%{placeholders.index(name) + 1}$s"

    value = re.sub(r"\{\{(\w+)\}\}", repl, value)
    escaped = sx.escape(value)
    escaped = escaped.replace("'", "\\'")
    # Collapse literal newlines into a space — Android string resources are single-line.
    escaped = escaped.replace("\n", " ")
    return escaped


def write_xml(pairs: dict[str, str], out_path: Path) -> None:
    lines = ['<?xml version="1.0" encoding="utf-8"?>', "<resources>"]
    for key, value in pairs.items():
        name = android_name(key)
        lines.append(f'    <string name="{name}">{to_android_value(value)}</string>')
    lines.append("</resources>")
    lines.append("")
    out_path.write_text("\n".join(lines), encoding="utf-8")


en = parse_ts(ROOT / "src/i18n/en.ts")
sv = parse_ts(ROOT / "src/i18n/sv.ts")
assert en.keys() == sv.keys(), f"key mismatch: {en.keys() ^ sv.keys()}"

write_xml(en, ROOT / "android/app/src/main/res/values/strings.xml")
write_xml(sv, ROOT / "android/app/src/main/res/values-sv/strings.xml")
print(f"Wrote {len(en)} strings to values/strings.xml and values-sv/strings.xml")
