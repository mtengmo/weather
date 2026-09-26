package com.tengmo.vader.ui.overview

import android.content.Context
import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import com.tengmo.vader.data.model.WeatherCondition

// T035 — port of src/components/smhiSymbolIcons.ts + weatherCharacterIcons.ts: SMHI symbol code /
// condition + temperature -> the pre-produced character artwork (124 weather icons, 25 companion
// characters), copied into res/drawable-nodpi with hyphens turned into underscores.

private val SMHI_CODE_TO_WEATHER_TYPE: Map<Int, String> = mapOf(
    1 to "clear", 2 to "nearly_clear", 3 to "variable", 4 to "variable",
    5 to "cloudy", 6 to "overcast", 7 to "fog",
    8 to "rain_light", 9 to "rain_light", 10 to "rain_heavy", 11 to "thunder",
    12 to "sleet", 13 to "sleet", 14 to "sleet",
    15 to "snow_light", 16 to "snow_light", 17 to "snow_heavy",
    18 to "rain_light", 19 to "rain_light", 20 to "rain_heavy", 21 to "thunder",
    22 to "sleet", 23 to "sleet", 24 to "sleet",
    25 to "snow_light", 26 to "snow_light", 27 to "snow_heavy",
)

// Best-fit SMHI code for a condition that has no symbol_code of its own (observations never do).
// `Windy` alone has no artwork and returns null so callers can fall back to text.
private val CONDITION_SMHI_FALLBACK: Map<WeatherCondition, Int> = mapOf(
    WeatherCondition.ClearDay to 1, WeatherCondition.ClearNight to 1,
    WeatherCondition.PartlyCloudy to 3, WeatherCondition.Cloudy to 5,
    WeatherCondition.LightRain to 18, WeatherCondition.HeavyRain to 20,
    WeatherCondition.LightSnow to 25, WeatherCondition.HeavySnow to 26,
    WeatherCondition.Thunderstorm to 11, WeatherCondition.Foggy to 7, WeatherCondition.Sleet to 23,
)

private fun iconBand(celsius: Double?): String = when {
    celsius == null -> "nearzero"
    celsius < -20 -> "frozen"
    celsius < -5 -> "cold"
    celsius < 5 -> "nearzero"
    celsius < 15 -> "mild"
    celsius < 25 -> "warm"
    else -> "hot"
}

/** Rain in a deep freeze / snow in warm weather were never generated — both fall back to that
 *  band's sleet artwork (spec FR-005 via smhiSymbolIcons.ts `resolveWeatherTypeForBand`). */
private fun resolveTypeForBand(type: String, band: String): String {
    val isColdBand = band == "frozen" || band == "cold"
    val isWarmBand = band == "mild" || band == "warm" || band == "hot"
    if ((type == "rain_light" || type == "rain_heavy") && isColdBand) return "sleet"
    if ((type == "snow_light" || type == "snow_heavy") && isWarmBand) return "sleet"
    return type
}

/** Looks up the drawable for one weather icon, or 0 when there is none (e.g. `Windy`). */
@DrawableRes
fun resolveWeatherIconRes(
    context: Context,
    smhiSymbolCode: Int?,
    condition: WeatherCondition?,
    isNight: Boolean,
    temperatureCelsius: Double?,
): Int {
    var code: Int? = smhiSymbolCode?.takeIf { it in SMHI_CODE_TO_WEATHER_TYPE }
    var useNight = isNight
    if (code == null && condition != null) {
        code = CONDITION_SMHI_FALLBACK[condition]
        useNight = condition == WeatherCondition.ClearNight
    }
    val type = code?.let { SMHI_CODE_TO_WEATHER_TYPE[it] } ?: return 0
    val band = iconBand(temperatureCelsius)
    val resolved = resolveTypeForBand(type, band)
    val name = "weather_${resolved}_${if (useNight) "night" else "day"}_$band"
    return context.resources.getIdentifier(name, "drawable", context.packageName)
}

private fun precipCategory(condition: WeatherCondition): String = when (condition) {
    WeatherCondition.LightRain, WeatherCondition.HeavyRain -> "rain"
    WeatherCondition.Thunderstorm -> "thunder"
    WeatherCondition.Sleet -> "sleet"
    WeatherCondition.LightSnow, WeatherCondition.HeavySnow -> "snow"
    else -> "dry" // windy et al. have no dedicated art (spec Edge Cases)
}

private fun characterTempBand(celsius: Double): String = when {
    celsius < -20 -> "frozen"
    celsius < 0 -> "cold"
    celsius < 15 -> "mild"
    celsius < 25 -> "warm"
    else -> "hot"
}

/** The companion character for a condition + temperature, or 0 when either is unavailable
 *  (FR-005 — the character is omitted rather than showing a broken image). */
@DrawableRes
fun resolveCharacterRes(context: Context, condition: WeatherCondition?, temperatureCelsius: Double?): Int {
    if (condition == null || temperatureCelsius == null) return 0
    val name = "character_${precipCategory(condition)}_${characterTempBand(temperatureCelsius)}"
    return context.resources.getIdentifier(name, "drawable", context.packageName)
}

@Composable
fun WeatherIconImage(
    smhiSymbolCode: Int?,
    condition: WeatherCondition?,
    isNight: Boolean,
    temperatureCelsius: Double?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val res = resolveWeatherIconRes(context, smhiSymbolCode, condition, isNight, temperatureCelsius)
    if (res != 0) {
        Image(painterResource(res), contentDescription, modifier, contentScale = ContentScale.Fit)
    }
}

@Composable
fun CompanionCharacterImage(
    condition: WeatherCondition?,
    temperatureCelsius: Double?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val res = resolveCharacterRes(context, condition, temperatureCelsius)
    if (res != 0) {
        Image(painterResource(res), contentDescription, modifier, contentScale = ContentScale.Fit)
    }
}
