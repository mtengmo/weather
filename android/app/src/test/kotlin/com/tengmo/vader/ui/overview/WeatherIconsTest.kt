package com.tengmo.vader.ui.overview

import com.tengmo.vader.data.model.WeatherCondition
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class WeatherIconsTest {
    private val drawableDir: File = listOf("src/main/res/drawable-nodpi", "app/src/main/res/drawable-nodpi")
        .map { File(it) }.first { it.isDirectory }

    private val existing: Set<String> = drawableDir.listFiles()!!.map { it.nameWithoutExtension }.toSet()
    private val has: (String) -> Boolean = { it in existing }

    private val bands = mapOf("frozen" to -30.0, "cold" to -10.0, "nearzero" to 0.0, "mild" to 10.0, "warm" to 20.0, "hot" to 30.0)
    private val codeTypes = mapOf(
        1 to "clear", 2 to "nearly_clear", 3 to "variable", 4 to "variable", 5 to "cloudy", 6 to "overcast", 7 to "fog",
        8 to "rain_light", 9 to "rain_light", 10 to "rain_heavy", 11 to "thunder", 12 to "sleet", 13 to "sleet", 14 to "sleet",
        15 to "snow_light", 16 to "snow_light", 17 to "snow_heavy", 18 to "rain_light", 19 to "rain_light", 20 to "rain_heavy",
        21 to "thunder", 22 to "sleet", 23 to "sleet", 24 to "sleet", 25 to "snow_light", 26 to "snow_light", 27 to "snow_heavy",
    )

    private fun spec(
        code: Int? = null, condition: WeatherCondition? = null, night: Boolean = false, temp: Double? = 10.0,
        windy: Boolean = false, sky: WeatherCondition? = null,
    ) = resolveWeatherIconSpec(code, condition, night, temp, windy, sky, has)

    @Test
    fun nonWindy_allCodesAndBands_matchPreviousNames() {
        for ((code, type) in codeTypes) for ((band, temp) in bands) for (night in listOf(false, true)) {
            val coldBand = band == "frozen" || band == "cold"
            val warmBand = band == "mild" || band == "warm" || band == "hot"
            val expectedType = when {
                type.startsWith("rain") && coldBand -> "sleet"
                type.startsWith("snow") && warmBand -> "sleet"
                else -> type
            }
            val expected = "weather_${expectedType}_${if (night) "night" else "day"}_$band"
            assertEquals(WeatherIconSpec(expected, false), spec(code = code, night = night, temp = temp))
        }
    }

    @Test
    fun windyClear_usesWindyArt() {
        assertEquals(WeatherIconSpec("weather_windy_clear_day_mild", false), spec(code = 1, windy = true))
    }

    @Test
    fun windyConditionWithoutSky_fallsBackToVariable_andFollowsNight() {
        assertEquals(WeatherIconSpec("weather_windy_variable_day_mild", false), spec(condition = WeatherCondition.Windy))
        assertEquals(WeatherIconSpec("weather_windy_variable_night_mild", false), spec(condition = WeatherCondition.Windy, night = true))
    }

    @Test
    fun windyConditionUsesSkyCode() {
        assertEquals(
            WeatherIconSpec("weather_windy_cloudy_day_warm", false),
            spec(condition = WeatherCondition.Windy, sky = WeatherCondition.Cloudy, temp = 20.0),
        )
    }

    @Test
    fun windyRainAndSnow() {
        assertEquals(WeatherIconSpec("weather_rain_light_windy_day_mild", false), spec(code = 18, windy = true))
        assertEquals(WeatherIconSpec("weather_snow_light_windy_day_frozen", false), spec(code = 25, windy = true, temp = -30.0))
    }

    @Test
    fun windyRainInColdBand_becomesSleetWithBadge() {
        assertEquals(WeatherIconSpec("weather_sleet_day_cold", true), spec(code = 18, windy = true, temp = -10.0))
    }

    @Test
    fun windySnowInWarmBand_becomesSleetWithBadge() {
        assertEquals(WeatherIconSpec("weather_sleet_day_warm", true), spec(code = 25, windy = true, temp = 20.0))
    }

    @Test
    fun windyThunderAndFog_keepBaseArtWithBadge() {
        assertEquals(WeatherIconSpec("weather_thunder_day_mild", true), spec(code = 11, windy = true))
        assertEquals(WeatherIconSpec("weather_fog_day_mild", true), spec(code = 7, windy = true))
    }

    @Test
    fun windyArtRequiresBothDayAndNight() {
        val onlyDay: (String) -> Boolean = { it != "weather_windy_clear_night_mild" && has(it) }
        assertEquals(
            WeatherIconSpec("weather_clear_day_mild", true),
            resolveWeatherIconSpec(1, null, false, 10.0, true, null, onlyDay),
        )
    }

    @Test
    fun noArtwork_returnsNull() {
        assertNull(resolveWeatherIconSpec(1, null, false, 10.0, false, null) { false })
        assertNull(spec(condition = null, code = null))
    }

    @Test
    fun everyProducibleNameExistsAsDrawable() {
        val conditions: List<WeatherCondition?> = WeatherCondition.values().toList() + null
        val names = mutableSetOf<String>()
        for (band in bands.values) for (night in listOf(false, true)) for (windy in listOf(false, true)) {
            for (code in listOf<Int?>(null) + codeTypes.keys) for (c in conditions) for (sky in conditions) {
                val s = resolveWeatherIconSpec(code, c, night, band, windy, sky) { true } ?: continue
                names += s.name
            }
        }
        assertTrue(names.isNotEmpty())
        val missing = names.filterNot { it in existing }
        assertTrue("Missing drawables: $missing", missing.isEmpty())
        assertNotNull(names.firstOrNull { it.contains("windy") })
    }
}
