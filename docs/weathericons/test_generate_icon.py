"""Unit tests for generate_icon.py (070-dalle-icon-prompt-tool, tasks.md T016). No network calls —
build_prompt/check_transparency are pure functions exercised directly."""

import unittest
from io import BytesIO

from PIL import Image

import generate_icon as g


class TestBuildPrompt(unittest.TestCase):
    def test_includes_clothing_and_scene_for_the_requested_combination(self):
        req = g.IconRequest(weather_type="cloudy", band="warm", time="day", wind="calm")
        prompt = g.build_prompt(req)
        self.assertIn(g.data.CLOTHING_BY_BAND["kvinna"]["warm"], prompt)
        self.assertIn(g.data.SCENE_BY_TYPE_BAND_TIME["cloudy"]["warm"]["day"], prompt)

    def test_uses_night_scene_when_time_is_night(self):
        req = g.IconRequest(weather_type="clear", band="mild", time="night", wind="calm")
        prompt = g.build_prompt(req)
        self.assertIn(g.data.SCENE_BY_TYPE_BAND_TIME["clear"]["mild"]["night"], prompt)
        self.assertNotIn(g.data.SCENE_BY_TYPE_BAND_TIME["clear"]["mild"]["day"], prompt)

    def test_wind_fragment_present_only_when_windy(self):
        calm = g.build_prompt(g.IconRequest("clear", "mild", "day", "calm"))
        windy = g.build_prompt(g.IconRequest("clear", "mild", "day", "windy"))
        self.assertNotIn(g.data.WIND_FRAGMENT, calm)
        self.assertIn(g.data.WIND_FRAGMENT, windy)

    def test_validate_supported_rejects_uncovered_character(self):
        with self.assertRaises(g.UnsupportedCombination):
            g.validate_supported(g.IconRequest("rain-light", "mild", "day", "calm"))


class TestCheckTransparency(unittest.TestCase):
    def _png_bytes(self, image: Image.Image) -> bytes:
        buf = BytesIO()
        image.save(buf, format="PNG")
        return buf.getvalue()

    def test_passes_an_image_with_real_alpha_variation(self):
        image = Image.new("RGBA", (10, 10), (255, 0, 0, 0))
        for x in range(5):
            for y in range(10):
                image.putpixel((x, y), (255, 0, 0, 255))
        passed, unique_count = g.check_transparency(self._png_bytes(image))
        self.assertTrue(passed)
        self.assertGreaterEqual(unique_count, 2)

    def test_fails_a_fully_opaque_image(self):
        image = Image.new("RGBA", (10, 10), (255, 0, 0, 255))
        passed, unique_count = g.check_transparency(self._png_bytes(image))
        self.assertFalse(passed)
        self.assertEqual(unique_count, 1)


if __name__ == "__main__":
    unittest.main()
