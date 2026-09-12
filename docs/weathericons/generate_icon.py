"""
generate_icon.py

Direct-generation icon prompt tool (070-dalle-icon-prompt-tool). Builds one complete prompt from a
maintainer-specified combination (weather type, temperature band, day/night, optional wind
condition), calls OpenAI's gpt-image-1 for exactly one image, verifies both real alpha
transparency and — via a separate vision-capable-model call — that the image's actual content
matches what was requested, and saves the result (plus its prompt and verdict) to a scratch output
directory that never touches this app's shipped icon set or the sprite-sheet-and-split pipeline.

Runs alongside split_icons.py/resize_icons.py; does not replace them.

Prerequisites:
    pip install openai pillow
    export OPENAI_API_KEY=sk-...          (never commit this)
    export ICON_GEN_MODEL=gpt-image-1     (optional override; see research.md §3)
    export ICON_VERIFY_MODEL=...          (optional override; confirm the current recommended
                                            vision-capable model name at the time you run this —
                                            model lineups change frequently)

Run (from docs/weathericons/):
    python generate_icon.py --type overcast --band mild --time day
    python generate_icon.py --type clear --band mild --time day --wind windy
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from PIL import Image

import icon_prompt_data as data

OUTPUT_DIR = Path(__file__).parent / "generated"
DEFAULT_GEN_MODEL = "gpt-image-1"
# Confirm this is still a current, cost-effective vision-capable model name before relying on the
# default — OpenAI's model lineup changes frequently (research.md §3).
DEFAULT_VERIFY_MODEL = "gpt-4o-mini"
ALPHA_VARIATION_MIN = 2


@dataclass(frozen=True)
class IconRequest:
    weather_type: str
    band: str
    time: str
    wind: str  # "calm" | "windy"


class UnsupportedCombination(Exception):
    """Raised when a requested combination isn't yet populated in icon_prompt_data.py — this
    pilot only covers the woman (kvinna) character's six dry-weather types (spec.md's Independent
    Test / tasks.md T009)."""


def parse_args(argv: list[str] | None = None) -> IconRequest:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--type", required=True, choices=sorted(data.TYPE_CATEGORY))
    parser.add_argument("--band", required=True, choices=data.BANDS)
    parser.add_argument("--time", required=True, choices=["day", "night"])
    parser.add_argument("--wind", default="calm", choices=["calm", "windy"])
    args = parser.parse_args(argv)
    return IconRequest(weather_type=args.type, band=args.band, time=args.time, wind=args.wind)


def _character_for(weather_type: str) -> str:
    category = data.TYPE_CATEGORY[weather_type]
    return data.CATEGORY_CHARACTER[category]


def validate_supported(request: IconRequest) -> None:
    """FR-001a/data-model.md: fail with a clear message for a combination not yet populated,
    rather than building a broken or misleading prompt."""
    character = _character_for(request.weather_type)
    if character not in data.CLOTHING_BY_BAND:
        raise UnsupportedCombination(
            f"The '{character}' character isn't populated in icon_prompt_data.py yet — this "
            f"pilot only covers 'kvinna' (the woman, dry-weather types). Requested type: "
            f"{request.weather_type!r}."
        )
    if request.band not in data.CLOTHING_BY_BAND[character]:
        raise UnsupportedCombination(
            f"No clothing description for character {character!r}, band {request.band!r}."
        )
    scenes_for_type = data.SCENE_BY_TYPE_BAND_TIME.get(request.weather_type)
    if scenes_for_type is None or request.band not in scenes_for_type:
        raise UnsupportedCombination(
            f"No scene description for weather type {request.weather_type!r}, band "
            f"{request.band!r} yet."
        )


def build_prompt(request: IconRequest) -> str:
    """FR-004: assembles the base style, guardrails, clothing, scene, and (if requested) the wind
    fragment into one final prompt string. Character consistency is pursued entirely through this
    detailed, consistently-worded text — no reference image is attached (spec.md Clarifications)."""
    character = _character_for(request.weather_type)
    clothing = data.CLOTHING_BY_BAND[character][request.band]
    scene = data.SCENE_BY_TYPE_BAND_TIME[request.weather_type][request.band][request.time]

    parts = [data.BASE_STYLE, *data.GUARDRAILS]
    parts.append(f"Character: {clothing}.")
    parts.append(f"Scene ({request.time}time): {scene}")
    if request.wind == "windy":
        parts.append(data.WIND_FRAGMENT)
    else:
        parts.append("Air is calm and still — no wind effect.")
    return "\n\n".join(parts)


def require_api_key() -> None:
    """FR-007: fail clearly, before any request, if credentials are missing — never prompt for
    one to be hardcoded."""
    if not os.environ.get("OPENAI_API_KEY"):
        print(
            "ERROR: OPENAI_API_KEY is not set. Set it as an environment variable (or in a "
            "git-ignored .env file you load yourself) before running this tool — never hardcode "
            "it into a file that could be committed.",
            file=sys.stderr,
        )
        sys.exit(1)


def generate_image(prompt: str, model: str) -> bytes:
    """FR-006: raises with a clear message on request failure; caller is responsible for catching
    and reporting it rather than letting a raw SDK exception be the only signal."""
    from openai import OpenAI  # imported lazily so --help works without the package installed

    client = OpenAI()
    result = client.images.generate(
        model=model,
        prompt=prompt,
        size="1024x1024",
        quality="auto",
        background="transparent",
        output_format="png",
    )
    b64 = result.data[0].b64_json
    return base64.b64decode(b64)


def check_transparency(image_bytes: bytes) -> tuple[bool, int]:
    """FR-005: real alpha transparency, not just a white/checkered background — mirrors
    split_icons.py's verify_alpha heuristic (>= 2 distinct alpha values), implemented here with
    plain Pillow (no numpy) since this tool's only declared dependencies are openai + pillow."""
    image = Image.open(BytesIO(image_bytes)).convert("RGBA")
    alpha_values = set(image.getchannel("A").tobytes())
    return len(alpha_values) >= ALPHA_VARIATION_MIN, len(alpha_values)


def _expected_content_description(request: IconRequest) -> str:
    wind_note = (
        "a windy effect (hair/clothing blown sideways, a little swirling debris)"
        if request.wind == "windy"
        else "calm, still air (no wind effect)"
    )
    extra = ""
    if request.weather_type == "overcast":
        extra = (
            " Specifically: the sky must show a solid, opaque, sharply-outlined gray cloud "
            "filling the whole frame, with NO haze, NO soft edges, and NO transparency."
        )
    elif request.weather_type == "fog":
        extra = (
            " Specifically: there must be NO distinct cloud shape anywhere — only a soft, "
            "semi-transparent misty haze low in the frame."
        )
    return (
        f"weather type '{request.weather_type}', temperature band '{request.band}', "
        f"time of day '{request.time}', with {wind_note}.{extra}"
    )


def verify_content(image_bytes: bytes, request: IconRequest, model: str) -> tuple[bool, str]:
    """FR-005a: sends the image plus a description of the expected content to a vision-capable
    model and uses its judgment as the content-correctness verdict."""
    from openai import OpenAI

    client = OpenAI()
    image_b64 = base64.b64encode(image_bytes).decode("ascii")
    question = (
        "You are verifying a generated cartoon weather icon. It was supposed to depict: "
        f"{_expected_content_description(request)} "
        "Look at the attached image and judge whether it actually matches this description. "
        "Respond with exactly one line: either the single word PASS, or FAIL: <a short reason>."
    )
    completion = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": question},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{image_b64}"},
                    },
                ],
            }
        ],
    )
    response_text = (completion.choices[0].message.content or "").strip()
    passed = response_text.upper().startswith("PASS")
    return passed, "" if passed else response_text


def output_paths(request: IconRequest) -> tuple[Path, Path]:
    suffix = "_windy" if request.wind == "windy" else ""
    stem = f"{request.weather_type}_{request.time}_{request.band}{suffix}"
    return OUTPUT_DIR / f"{stem}.png", OUTPUT_DIR / f"{stem}.json"


def main(argv: list[str] | None = None) -> int:
    request = parse_args(argv)

    try:
        validate_supported(request)
    except UnsupportedCombination as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    require_api_key()
    gen_model = os.environ.get("ICON_GEN_MODEL", DEFAULT_GEN_MODEL)
    verify_model = os.environ.get("ICON_VERIFY_MODEL", DEFAULT_VERIFY_MODEL)

    prompt = build_prompt(request)

    try:
        image_bytes = generate_image(prompt, gen_model)
    except Exception as exc:  # noqa: BLE001 - surfaced to the maintainer, not swallowed
        print(f"ERROR: image generation request failed: {exc}", file=sys.stderr)
        return 1

    transparency_ok, unique_alpha = check_transparency(image_bytes)

    try:
        content_ok, content_reason = verify_content(image_bytes, request, verify_model)
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: content-verification request failed: {exc}", file=sys.stderr)
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    png_path, json_path = output_paths(request)
    png_path.write_bytes(image_bytes)
    metadata = {
        "parameters": {
            "type": request.weather_type,
            "band": request.band,
            "time": request.time,
            "wind": request.wind,
        },
        "prompt": prompt,
        "transparency_check": {"pass": transparency_ok, "unique_alpha_values": unique_alpha},
        "content_check": {"pass": content_ok, "reason": content_reason},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    json_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    overall_pass = transparency_ok and content_ok
    status = "PASS" if overall_pass else "FAIL"
    print(f"{status}: {png_path}")
    print(f"  transparency: {'ok' if transparency_ok else 'FAILED'} ({unique_alpha} alpha values)")
    print(f"  content check: {'ok' if content_ok else 'FAILED: ' + content_reason}")
    return 0 if overall_pass else 1


if __name__ == "__main__":
    sys.exit(main())
