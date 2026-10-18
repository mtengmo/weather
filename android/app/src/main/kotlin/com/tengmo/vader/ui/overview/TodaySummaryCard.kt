package com.tengmo.vader.ui.overview

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R
import com.tengmo.vader.data.model.DailyAggregate
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.UnitSystem
import com.tengmo.vader.data.model.WeatherCondition
import com.tengmo.vader.data.model.WeatherWarning
import com.tengmo.vader.data.repository.WeatherConditionInput
import com.tengmo.vader.data.repository.convertPrecipitation
import com.tengmo.vader.data.repository.convertTemperature
import com.tengmo.vader.data.repository.convertWindSpeed
import com.tengmo.vader.data.repository.deriveWeatherCondition
import com.tengmo.vader.data.repository.directionToCompass
import com.tengmo.vader.data.repository.formatValue
import com.tengmo.vader.data.repository.getMoonPhase
import com.tengmo.vader.data.repository.getSunTimes
import com.tengmo.vader.data.repository.isNight
import com.tengmo.vader.data.repository.precipitationUnitLabel
import com.tengmo.vader.data.repository.windUnitLabel
import com.tengmo.vader.ui.stringByName
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import com.tengmo.vader.ui.TimeFormat
import com.tengmo.vader.ui.appLocale
import java.util.Locale

/** Resource name (weatherCondition_*) of a condition's one-word label. */
internal fun conditionStringKey(c: WeatherCondition): String = "weatherCondition_" + when (c) {
    WeatherCondition.ClearDay -> "clearDay"
    WeatherCondition.ClearNight -> "clearNight"
    WeatherCondition.PartlyCloudy -> "partlyCloudy"
    WeatherCondition.Cloudy -> "cloudy"
    WeatherCondition.LightRain -> "lightRain"
    WeatherCondition.HeavyRain -> "heavyRain"
    WeatherCondition.Windy -> "windy"
    WeatherCondition.LightSnow -> "lightSnow"
    WeatherCondition.HeavySnow -> "heavySnow"
    WeatherCondition.Thunderstorm -> "thunderstorm"
    WeatherCondition.Foggy -> "foggy"
    WeatherCondition.Sleet -> "sleet"
}

/** Groups label/value pairs into rows of two for the fixed 2-column grid. */
internal fun <T> pairUp(items: List<T>): List<List<T>> = items.chunked(2)

private fun String.capitalised(): String = replaceFirstChar { it.uppercase() }

private fun formatTime(instant: Instant?, locale: Locale): String =
    instant?.atZone(ZoneId.systemDefault())?.let { TimeFormat.clock(it, locale) } ?: "—"

/** Persistent "Today" summary: characters + current temp/condition, high/low pair, a 2-column
 *  fact grid (rain, wind+compass, sun, moon, humidity), and expandable informational notices. */
@Composable
fun TodaySummaryCard(
    today: DailyAggregate?,
    unit: UnitSystem,
    location: Location,
    currentCondition: WeatherCondition?,
    currentTemperature: Double?,
    currentFeelsLike: Double?,
    todaysRainTotalMm: Double?,
    informationalWarnings: List<WeatherWarning>,
    currentHumidity: Int?,
    modifier: Modifier = Modifier,
) {
    if (today == null) return

    var expandedNoticeIds by remember { mutableStateOf(setOf<String>()) }

    val dayCondition = deriveWeatherCondition(
        WeatherConditionInput(
            temperature = today.average,
            precipitation = today.totalPrecipitation,
            windSpeed = today.windAverage,
            cloudCoverPercent = today.cloudAverage?.toInt(),
            chanceOfRain = today.chanceOfRainMax,
        ),
    )
    val condition = currentCondition ?: dayCondition
    // Falls back to today's high/low midpoint when there's no current reading, rather than
    // omitting the icon/character outright (061-cartoon-weather-companion, US3).
    val characterTemperature = currentTemperature
        ?: if (today.high != null && today.low != null) (today.high + today.low) / 2 else null

    val rainTotal = todaysRainTotalMm ?: today.totalPrecipitation
    val (sunrise, sunset) = getSunTimes(location.latitude, location.longitude, LocalDate.now())
    val moonPhase = getMoonPhase()

    val conditionLabel = condition?.let { stringByName(conditionStringKey(it)) } ?: ""
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    val nowText = currentTemperature?.let { formatValue(convertTemperature(it, unit), 0) }
    val feelsText = currentFeelsLike?.let { formatValue(convertTemperature(it, unit), 0) }
    val headlineDescription = if (nowText != null) {
        // Two complete messages (never a base sentence plus an appended fragment) so each translates whole.
        if (feelsText != null) {
            stringResource(R.string.todaySummary_a11yNowFeels, nowText, conditionLabel, feelsText)
        } else {
            stringResource(R.string.todaySummary_a11yNow, nowText, conditionLabel)
        }
    } else {
        conditionLabel
    }

    val locale = appLocale()
    val compass = today.windDirection?.let { " ${directionToCompass(it)}" } ?: ""
    val facts = buildList {
        add(
            stringResource(R.string.todaySummary_rain) to
                "${formatValue(convertPrecipitation(rainTotal, unit), 1)} ${precipitationUnitLabel(unit)}",
        )
        add(
            stringResource(R.string.todaySummary_wind) to
                "${formatValue(convertWindSpeed(today.windAverage, unit), 0)} ${windUnitLabel(unit)}$compass",
        )
        add(stringResource(R.string.todaySummary_sunrise) to formatTime(sunrise, locale))
        add(stringResource(R.string.todaySummary_sunset) to formatTime(sunset, locale))
        add(stringResource(R.string.todaySummary_moon) to stringByName(moonPhase.stringKey))
        if (currentHumidity != null) {
            val levelKey = when {
                currentHumidity < 30 -> R.string.todaySummary_humidityDry
                currentHumidity <= 70 -> R.string.todaySummary_humidityNormal
                else -> R.string.todaySummary_humidityHigh
            }
            add(stringResource(R.string.todaySummary_humidity) to stringResource(levelKey))
        }
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    WeatherIconImage(
                        smhiSymbolCode = null,
                        condition = condition,
                        isNight = isNight(Instant.now().toString()),
                        temperatureCelsius = characterTemperature,
                        contentDescription = null,
                        modifier = Modifier.size(72.dp),
                    )
                    CompanionCharacterImage(
                        condition = condition,
                        temperatureCelsius = characterTemperature,
                        contentDescription = null,
                        modifier = Modifier.size(72.dp),
                    )
                }
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .semantics(mergeDescendants = true) { contentDescription = headlineDescription },
                ) {
                    if (nowText != null) {
                        Text(
                            "$nowText°",
                            style = MaterialTheme.typography.displayMedium,
                            maxLines = 1,
                            softWrap = false,
                        )
                    }
                    if (conditionLabel.isNotEmpty()) {
                        Text(conditionLabel, style = MaterialTheme.typography.titleMedium)
                    }
                    if (feelsText != null) {
                        Text(
                            "${stringResource(R.string.todaySummary_feelsLike).capitalised()} $feelsText°",
                            style = MaterialTheme.typography.bodyMedium,
                            color = muted,
                        )
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                LabelValue(
                    stringResource(R.string.todaySummary_high),
                    "${formatValue(convertTemperature(today.high, unit), 0)}°",
                    Modifier.weight(1f),
                )
                LabelValue(
                    stringResource(R.string.todaySummary_low),
                    "${formatValue(convertTemperature(today.low, unit), 0)}°",
                    Modifier.weight(1f),
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                pairUp(facts).forEach { rowItems ->
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        rowItems.forEach { (l, v) -> LabelValue(l, v, Modifier.weight(1f)) }
                        if (rowItems.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }

            informationalWarnings.forEach { warning ->
                val expanded = warning.id in expandedNoticeIds
                val stateText = stringResource(
                    if (expanded) R.string.todaySummary_noticeExpanded else R.string.todaySummary_noticeCollapsed,
                )
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.background,
                    modifier = Modifier
                        .fillMaxWidth()
                        .semantics { stateDescription = stateText }
                        .clickable(role = Role.Button) {
                            expandedNoticeIds =
                                if (expanded) expandedNoticeIds - warning.id else expandedNoticeIds + warning.id
                        },
                ) {
                    Column(Modifier.padding(horizontal = 12.dp)) {
                        Row(
                            modifier = Modifier.heightIn(min = 48.dp).padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                warning.title,
                                style = MaterialTheme.typography.bodyLarge,
                                modifier = Modifier.weight(1f),
                            )
                            Image(
                                painter = painterResource(R.drawable.ic_expand_more),
                                contentDescription = null,
                                colorFilter = ColorFilter.tint(muted),
                                modifier = Modifier.size(24.dp).rotate(if (expanded) 180f else 0f),
                            )
                        }
                        if (expanded) {
                            Text(
                                warning.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = muted,
                                modifier = Modifier.padding(bottom = 12.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LabelValue(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyLarge)
    }
}
