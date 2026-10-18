"""Generator for T025/T026 — ports src/i18n/en.ts and sv.ts key/value pairs into
Android res/values/strings.xml and res/values-sv/strings.xml.

Only these two generated files are written. Android-only strings (widget_*, permission_*,
nav_*, attribution_*, ...) live in res/values*/strings_android.xml, which this script never
touches. Re-run after the web app's i18n files change (FR-009).

Usage:
    python android/scripts/gen_strings.py          # regenerate strings.xml files
    python android/scripts/gen_strings.py --check  # exit 1 if committed files are stale
"""
import difflib
import re
import sys
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


def render_xml(pairs: dict[str, str]) -> str:
    lines = ['<?xml version="1.0" encoding="utf-8"?>', "<resources>"]
    for key, value in pairs.items():
        name = android_name(key)
        lines.append(f'    <string name="{name}">{to_android_value(value)}</string>')
    lines.append("</resources>")
    lines.append("")
    return "\n".join(lines)


def main(argv: list[str]) -> int:
    en = parse_ts(ROOT / "src/i18n/en.ts")
    sv = parse_ts(ROOT / "src/i18n/sv.ts")
    assert en.keys() == sv.keys(), f"key mismatch: {en.keys() ^ sv.keys()}"

    targets = {
        ROOT / "android/app/src/main/res/values/strings.xml": render_xml(en),
        ROOT / "android/app/src/main/res/values-sv/strings.xml": render_xml(sv),
    }

    if "--check" in argv:
        stale = False
        for path, expected in targets.items():
            actual = path.read_text(encoding="utf-8") if path.exists() else ""
            if actual != expected:
                stale = True
                rel = path.relative_to(ROOT).as_posix()
                diff = difflib.unified_diff(
                    actual.splitlines(),
                    expected.splitlines(),
                    fromfile=f"{rel} (committed)",
                    tofile=f"{rel} (generated)",
                    lineterm="",
                )
                print("\n".join(diff))
        if stale:
            print(
                "\nstrings.xml is out of date. Run: python android/scripts/gen_strings.py",
                file=sys.stderr,
            )
            return 1
        print(f"OK: {len(en)} generated strings are up to date.")
        return 0

    for path, content in targets.items():
        path.write_text(content, encoding="utf-8")
    print(f"Wrote {len(en)} strings to values/strings.xml and values-sv/strings.xml")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
