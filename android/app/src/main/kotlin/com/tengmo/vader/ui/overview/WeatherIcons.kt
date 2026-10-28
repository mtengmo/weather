package com.tengmo.vader.ui.overview

import android.content.Context
import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
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
// `Windy` is handled by resolveWeatherIconSpec (sky-based code + wind art/badge).
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

/** Base weather type -> its wind-variant artwork type. Types without an entry (sleet, thunder, fog)
 *  keep their base art and get the wind badge instead (port of smhiSymbolIcons.ts WINDY_VARIANT). */
private val WINDY_VARIANT: Map<String, String> = mapOf(
    "clear" to "windy_clear", "nearly_clear" to "windy_clear", "variable" to "windy_variable",
    "cloudy" to "windy_cloudy", "overcast" to "windy_cloudy",
    "rain_light" to "rain_light_windy", "rain_heavy" to "rain_heavy_windy",
    "snow_light" to "snow_light_windy", "snow_heavy" to "snow_heavy_windy",
)

/** The artwork drawable [name] to show and whether a wind badge must be drawn over it. */
data class WeatherIconSpec(val name: String, val windBadge: Boolean)

/**
 * Pure port of smhiSymbolIcons.ts `resolveFromParts`. Returns null when no artwork applies.
 * [hasArtwork] tells whether a drawable name exists, so windy art is only used when both its day
 * and night variants exist; otherwise the base art is used with a wind badge.
 */
fun resolveWeatherIconSpec(
    smhiSymbolCode: Int?,
    condition: WeatherCondition?,
    isNight: Boolean,
    temperatureCelsius: Double?,
    windy: Boolean,
    skyCondition: WeatherCondition?,
    hasArtwork: (String) -> Boolean,
): WeatherIconSpec? {
    var code: Int? = smhiSymbolCode?.takeIf { it in SMHI_CODE_TO_WEATHER_TYPE }
    var useNight = isNight
    var isWindy = windy
    if (code == null && condition != null) {
        // A "windy" condition hides the sky, so the caller passes the sky-only condition; code 3 if missing.
        val fallback = if (condition == WeatherCondition.Windy) {
            (skyCondition?.let { CONDITION_SMHI_FALLBACK[it] }) ?: 3
        } else {
            CONDITION_SMHI_FALLBACK[condition]
        }
        if (fallback != null) {
            code = fallback
            if (condition == WeatherCondition.Windy) isWindy = true
            // Windy has no night/day of its own, so it follows the caller's night flag.
            useNight = condition == WeatherCondition.ClearNight || (condition == WeatherCondition.Windy && isNight)
        }
    }
    val type = code?.let { SMHI_CODE_TO_WEATHER_TYPE[it] } ?: return null
    val band = iconBand(temperatureCelsius)
    val resolved = resolveTypeForBand(type, band)
    fun artName(t: String, night: Boolean) = "weather_${t}_${if (night) "night" else "day"}_$band"
    val baseName = artName(resolved, useNight)
    if (!hasArtwork(baseName)) return null
    if (isWindy) {
        val windyType = WINDY_VARIANT[resolved]
        if (windyType != null && hasArtwork(artName(windyType, false)) && hasArtwork(artName(windyType, true))) {
            return WeatherIconSpec(artName(windyType, useNight), windBadge = false)
        }
    }
    return WeatherIconSpec(baseName, windBadge = isWindy)
}

private fun resolveSpec(
    context: Context,
    smhiSymbolCode: Int?,
    condition: WeatherCondition?,
    isNight: Boolean,
    temperatureCelsius: Double?,
    windy: Boolean,
    skyCondition: WeatherCondition?,
): Pair<Int, Boolean> {
    val spec = resolveWeatherIconSpec(
        smhiSymbolCode, condition, isNight, temperatureCelsius, windy, skyCondition,
    ) { name -> drawableId(context, name) != 0 }
        ?: return 0 to false
    return drawableId(context, spec.name) to spec.windBadge
}

/** Looks up the drawable for one weather icon, or 0 when there is none. */
@DrawableRes
fun resolveWeatherIconRes(
    context: Context,
    smhiSymbolCode: Int?,
    condition: WeatherCondition?,
    isNight: Boolean,
    temperatureCelsius: Double?,
    windy: Boolean = false,
    skyCondition: WeatherCondition? = null,
): Int = resolveSpec(context, smhiSymbolCode, condition, isNight, temperatureCelsius, windy, skyCondition).first

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
    return drawableId(context, name)
}

// Resource-name lookups go through reflection-like string matching; the set of names is small and
// fixed per install, so remember results (0 = no such drawable) per name.
private val drawableIdCache = java.util.concurrent.ConcurrentHashMap<String, Int>()

private fun drawableId(context: Context, name: String): Int =
    drawableIdCache.getOrPut(name) { context.resources.getIdentifier(name, "drawable", context.packageName) }

@Composable
fun WeatherIconImage(
    smhiSymbolCode: Int?,
    condition: WeatherCondition?,
    isNight: Boolean,
    temperatureCelsius: Double?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    windy: Boolean = false,
    skyCondition: WeatherCondition? = null,
) {
    val context = LocalContext.current
    val (res, badge) = resolveSpec(context, smhiSymbolCode, condition, isNight, temperatureCelsius, windy, skyCondition)
    if (res != 0) {
        Box(modifier) {
            Image(painterResource(res), contentDescription, Modifier.matchParentSize(), contentScale = ContentScale.Fit)
            if (badge) WindBadge(Modifier.align(Alignment.BottomEnd))
        }
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
