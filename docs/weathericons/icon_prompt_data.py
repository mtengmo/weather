"""
icon_prompt_data.py

One-time-extracted prompt fragments for generate_icon.py (070-dalle-icon-prompt-tool). Sourced
from docs/weathericons_prompts_legacy/*.txt — the app's already-authored, battle-tested per-column
sprite-sheet prompts — restructured here for single-image (non-grid) generation, and manually
transcribed rather than parsed at runtime (research.md §4: a person can diff this once against the
source files; a fragile prose parser would need to keep working forever).

Only the woman ("kvinna") character's six dry-weather types are populated for this feature's pilot
scope (spec.md's Independent Test) — the other three characters (par/pojke_gubbe/flicka) and their
weather types are intentionally left unpopulated for now; generate_icon.py's own validation
(T009) rejects any request for a combination not yet present here, with a clear message, rather
than silently producing a broken prompt.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Category / character mapping — restates sheet-manifest.json's code_mapping /
# vaderikoner-promptguide.md's precipitation-category table for direct lookup.
# ---------------------------------------------------------------------------

TYPE_CATEGORY: dict[str, str] = {
    "clear": "dry",
    "nearly-clear": "dry",
    "variable": "dry",
    "cloudy": "dry",
    "overcast": "dry",
    "fog": "dry",
    "rain-light": "rain",
    "rain-heavy": "rain",
    "thunder": "thunder-sleet",
    "sleet": "thunder-sleet",
    "snow-light": "snow",
    "snow-heavy": "snow",
}

CATEGORY_CHARACTER: dict[str, str] = {
    "dry": "kvinna",
    "rain": "par",
    "thunder-sleet": "pojke_gubbe",
    "snow": "flicka",
}

BANDS: tuple[str, ...] = ("frozen", "cold", "nearzero", "mild", "warm", "hot")

# ---------------------------------------------------------------------------
# Shared base style + guardrails — identical across every docs/weathericons_prompts_legacy/*.txt
# file, adapted here from "sprite sheet grid" framing ("every column of this sheet", "row 1/row 2")
# to single-image framing.
# ---------------------------------------------------------------------------

BASE_STYLE = (
    "flat vector cartoon illustration, thick clean black outlines, consistent flat cel-shading "
    "(NOT painterly, NOT airbrushed, NOT semi-realistic rendering, NO soft photographic "
    "gradients), playful and humorous, soft rounded shapes, limited pastel color palette, "
    "children's book weather app icon style, no text, no watermark, no signature."
)

GUARDRAILS: list[str] = [
    "Canvas: square image, the character fills approximately 70% of the frame height, with a "
    "generous empty margin on all sides — do not crop the character.",
    "Background: fully transparent (alpha channel). Absolutely no ground line, floor, shadow, "
    "platform, or background scenery of any kind — the character must appear to float freely.",
    "Style consistency: match the flat-vector children's-book icon style described above as "
    "closely and consistently as possible — avoid drifting toward a painterly, semi-realistic, or "
    "oversized-head 'chibi' style.",
    "No invented accessories: do not add any clothing item, accessory, or prop that is not "
    "explicitly listed in the character/clothing description below.",
    "No invented precipitation: do not add rain, snow, sleet, or hail on your own initiative "
    "unless the weather description below explicitly calls for it.",
    "No invented wind effects unless explicitly requested below: no blowing leaves, swirling air "
    "lines, flying debris, or hair/clothing blown sideways — default to calm, still air.",
]

# New for 070 — not present in any legacy file (research.md §5).
WIND_FRAGMENT = (
    "Windy effect: the character's hair and any loose clothing are blown sideways as if in a "
    "stiff wind, with a few loose leaves or bits of debris swirling nearby — clearly windy, not "
    "just a light breeze."
)

# ---------------------------------------------------------------------------
# Clothing per (character, band) — the "Character(s) for this sheet:" line from each legacy file.
# ---------------------------------------------------------------------------

CLOTHING_BY_BAND: dict[str, dict[str, str]] = {
    "kvinna": {
        "frozen": (
            "an adult woman in her 30s, shoulder-length wavy brown hair, average "
            "non-exaggerated adult cartoon body proportions, dressed as a frozen eskimo — huge "
            "fur-lined parka hood, only eyes visible, icicles on eyebrows, breath frozen into an "
            "ice cloud, standing stiff like a popsicle"
        ),
        "cold": (
            "an adult woman in her 30s, shoulder-length wavy brown hair, average "
            "non-exaggerated adult cartoon body proportions, wearing a puffy winter coat, "
            "oversized knit hat with pom-pom sliding over eyes, huge scarf to the nose, mittens, "
            "bright red frozen nose, shivering with wavy motion lines"
        ),
        "nearzero": (
            "an adult woman in her 30s, shoulder-length wavy brown hair, average "
            "non-exaggerated adult cartoon body proportions, wearing a medium zipped-up jacket, "
            "beanie, hands in pockets, visible cool breath, brisk neutral expression"
        ),
        "mild": (
            "an adult woman in her 30s, shoulder-length wavy brown hair, average "
            "non-exaggerated adult cartoon body proportions, wearing a casual everyday jacket "
            "and jeans, relaxed neutral expression, hands in pockets"
        ),
        "warm": (
            "an adult woman in her 30s, shoulder-length wavy brown hair, average "
            "non-exaggerated adult cartoon body proportions, wearing a light t-shirt and shorts, "
            "relaxed happy pose, holding an ice cream cone. During the day she wears sunglasses "
            "pushed up on her head; at night she wears no sunglasses, same relaxed happy pose "
            "otherwise"
        ),
        "hot": (
            "an adult woman in her 30s, shoulder-length wavy brown hair, average "
            "non-exaggerated adult cartoon body proportions, wearing a modest one-piece swimsuit "
            "(full coverage, cartoon-cute style, not a bikini), sitting in a relaxed neutral pose "
            "on a tiny beach chair, sipping a drink with a straw, melting ice cream dripping down "
            "the hand. During the day she wears sunglasses; at night she wears no sunglasses, "
            "calm sleepy smile instead, same pose otherwise"
        ),
    }
}

# ---------------------------------------------------------------------------
# Scene descriptions — confirmed band-specific via checksum comparison of the legacy files
# (research.md §4): frozen/cold/nearzero share identical wording (with a "breath visibly frozen"
# addition) for clear/nearly-clear/variable/cloudy; mild/warm/hot share identical wording without
# it. overcast/fog (sourced from the dedicated *b_* files) are identical across ALL six bands.
# ---------------------------------------------------------------------------

_COLD_BREATH_SUFFIX = " Her breath is visibly frozen in the cold air."

_DRY_SCENES_BASE: dict[str, dict[str, str]] = {
    "clear": {
        "day": (
            "A bright sun in a clear blue sky, warm golden sunlight. The character has a "
            "relaxed, happy pose."
        ),
        "night": (
            "A full moon in a clear night sky with twinkling stars scattered around it. The "
            "character has a calm, relaxed pose."
        ),
    },
    "nearly-clear": {
        "day": (
            "The sun peeking shyly from behind one small cloud, soft dappled daylight. The "
            "character has a relaxed pose, squinting slightly in the sunlight."
        ),
        "night": (
            "A crescent moon peeking from behind one small cloud that glows silver at the edge, "
            "soft moonlight. The character has calm, relaxed eyes in the moonlight."
        ),
    },
    "variable": {
        "day": (
            "Two small separate clouds with a clear gap of blue sky between them, the sun still "
            "peeking through the gap — this must look less cloud-covered than 'cloudy'. Quick "
            "shifting daylight. The character has a slightly puzzled pose, glancing up at the "
            "shifting sky."
        ),
        "night": (
            "Two small clouds with a gap of night sky between them, the moon peeking through the "
            "gap. The character has a slightly puzzled pose, glancing up at the shifting night "
            "sky."
        ),
    },
    "cloudy": {
        "day": (
            "One single medium round puffy cloud, no sun, but a thin visible strip of plain blue "
            "sky still showing around the top/side edges of the frame — this must look more "
            "covered than 'variable' but clearly less covered than 'overcast'. Soft diffused "
            "daylight. The character has a neutral, calm pose."
        ),
        "night": (
            "The same single cloud in a dark night tone, with a thin strip of night sky still "
            "visible at the edges. The character has a neutral, calm pose."
        ),
    },
}

# From the dedicated *b_* files (research.md §4) — identical across all six bands, this app's own
# prior fix attempt at the exact overcast/fog distinction that's been hard to get right.
_OVERCAST_FOG_SCENES: dict[str, dict[str, str]] = {
    "overcast": {
        "day": (
            "A wide, 100% opaque, solid-filled gray cloud shape with a crisp thick black outline, "
            "like a single big pillow completely filling the upper frame edge-to-edge — flat, "
            "even, matte gray fill, one shade darker than the 'cloudy' cloud but still a normal "
            "solid cartoon cloud shape, just bigger and covering the whole sky. NO transparency, "
            "NO haze, NO soft edges, NO glow, NO see-through quality anywhere in this cloud. NO "
            "rain, NO lightning, NO wind or blowing leaves. The character stands normally, fully "
            "clearly visible from head to toe with sharp edges — NOT obscured, NOT hazy, NOT "
            "blurred. Flat, cool daylight."
        ),
        "night": (
            "The same wide, 100% opaque, solid gray cloud filling the sky edge-to-edge, rendered "
            "in a gray-not-black night tone — near-total cloud cover. The character stands "
            "normally, fully clearly visible with sharp edges, not obscured or hazy."
        ),
    },
    "fog": {
        "day": (
            "NO cloud shape at all in the sky — the upper frame is empty. Instead, thin, wispy, "
            "semi-TRANSPARENT horizontal bands of pale gray-white mist drift across the LOWER "
            "half of the frame, partially obscuring the character's legs and feet — soft, "
            "diffuse, see-through edges (the opposite rendering style from the solid, opaque "
            "cloud shapes used for every other weather type). The character's upper body and face "
            "stay clearly visible; only the lower body is softly veiled by the mist. Hazy, pale "
            "light filtering through."
        ),
        "night": (
            "The same thin, wispy, semi-transparent mist drifting across the lower half of the "
            "frame at night, with a faint glowing moon smudge barely visible through the mist. "
            "The character's upper body and face stay clearly visible; only the lower body is "
            "softly veiled."
        ),
    },
}

_COLD_BANDS = ("frozen", "cold", "nearzero")
_WARM_BANDS = ("mild", "warm", "hot")


def _build_dry_scenes() -> dict[str, dict[str, dict[str, str]]]:
    """SCENE_BY_TYPE_BAND_TIME's "dry" entries: clear/nearly-clear/variable/cloudy get the cold-band
    breath suffix for frozen/cold/nearzero only; overcast/fog are identical across all six bands."""
    scenes: dict[str, dict[str, dict[str, str]]] = {}
    for weather_type, by_time in _DRY_SCENES_BASE.items():
        scenes[weather_type] = {}
        for band in BANDS:
            suffix = _COLD_BREATH_SUFFIX if band in _COLD_BANDS else ""
            scenes[weather_type][band] = {
                "day": by_time["day"] + suffix,
                "night": by_time["night"] + suffix,
            }
    for weather_type, by_time in _OVERCAST_FOG_SCENES.items():
        scenes[weather_type] = {band: dict(by_time) for band in BANDS}
    return scenes


# dict[type][band][day|night] -> str (data-model.md)
SCENE_BY_TYPE_BAND_TIME: dict[str, dict[str, dict[str, str]]] = _build_dry_scenes()


def _validate() -> None:
    """Fail fast at import time on a data-entry mistake, rather than at prompt-build time for some
    future combination (data-model.md's validation rule)."""
    for category, character in CATEGORY_CHARACTER.items():
        if character not in CLOTHING_BY_BAND:
            continue  # not yet populated for this pilot (par/pojke_gubbe/flicka) — allowed
        for band in BANDS:
            if band not in CLOTHING_BY_BAND[character]:
                raise AssertionError(f"Missing CLOTHING_BY_BAND[{character!r}][{band!r}]")

    for weather_type, category in TYPE_CATEGORY.items():
        character = CATEGORY_CHARACTER[category]
        if character not in CLOTHING_BY_BAND:
            continue  # not yet populated for this pilot — allowed
        if weather_type not in SCENE_BY_TYPE_BAND_TIME:
            continue  # not yet populated for this pilot — allowed
        for band in BANDS:
            entry = SCENE_BY_TYPE_BAND_TIME[weather_type].get(band)
            if entry is None or "day" not in entry or "night" not in entry:
                raise AssertionError(
                    f"Missing SCENE_BY_TYPE_BAND_TIME[{weather_type!r}][{band!r}][day/night]"
                )


_validate()
