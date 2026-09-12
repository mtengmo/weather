"""Unit tests for icon_prompt_data.py (070-dalle-icon-prompt-tool, tasks.md T015). No network
calls — pure data-structure checks."""

import unittest

import icon_prompt_data as data


class TestMappings(unittest.TestCase):
    def test_every_weather_type_has_a_category(self):
        for weather_type in data.TYPE_CATEGORY:
            self.assertIn(data.TYPE_CATEGORY[weather_type], data.CATEGORY_CHARACTER)

    def test_dry_types_map_to_kvinna(self):
        dry_types = ["clear", "nearly-clear", "variable", "cloudy", "overcast", "fog"]
        for weather_type in dry_types:
            category = data.TYPE_CATEGORY[weather_type]
            self.assertEqual(data.CATEGORY_CHARACTER[category], "kvinna")

    def test_other_categories_map_to_their_own_character(self):
        self.assertEqual(data.CATEGORY_CHARACTER[data.TYPE_CATEGORY["rain-light"]], "par")
        self.assertEqual(data.CATEGORY_CHARACTER[data.TYPE_CATEGORY["thunder"]], "pojke_gubbe")
        self.assertEqual(data.CATEGORY_CHARACTER[data.TYPE_CATEGORY["snow-light"]], "flicka")


class TestKvinnaData(unittest.TestCase):
    def test_clothing_exists_for_every_band(self):
        for band in data.BANDS:
            self.assertIn(band, data.CLOTHING_BY_BAND["kvinna"])
            self.assertTrue(data.CLOTHING_BY_BAND["kvinna"][band])

    def test_scene_exists_for_every_dry_type_and_band(self):
        for weather_type in ["clear", "nearly-clear", "variable", "cloudy", "overcast", "fog"]:
            for band in data.BANDS:
                entry = data.SCENE_BY_TYPE_BAND_TIME[weather_type][band]
                self.assertIn("day", entry)
                self.assertIn("night", entry)
                self.assertTrue(entry["day"])
                self.assertTrue(entry["night"])

    def test_overcast_and_fog_are_never_accidentally_swapped_or_merged(self):
        # Guards against the exact regression this feature exists to prevent: overcast must read
        # as a solid opaque cloud, fog must read as a soft transparent haze, and neither
        # description should leak the other's defining vocabulary.
        for band in data.BANDS:
            overcast_text = data.SCENE_BY_TYPE_BAND_TIME["overcast"][band]["day"]
            fog_text = data.SCENE_BY_TYPE_BAND_TIME["fog"][band]["day"]
            self.assertIn("100% opaque", overcast_text)
            self.assertIn("NO transparency", overcast_text)
            self.assertIn("semi-TRANSPARENT", fog_text)
            self.assertNotIn("100% opaque", fog_text)
            self.assertNotIn("semi-TRANSPARENT", overcast_text)

    def test_cold_bands_mention_frozen_breath_warm_bands_do_not(self):
        for band in ("frozen", "cold", "nearzero"):
            self.assertIn(
                "frozen", data.SCENE_BY_TYPE_BAND_TIME["clear"][band]["day"].lower()
            )
        for band in ("mild", "warm", "hot"):
            self.assertNotIn(
                "breath", data.SCENE_BY_TYPE_BAND_TIME["clear"][band]["day"].lower()
            )


if __name__ == "__main__":
    unittest.main()
