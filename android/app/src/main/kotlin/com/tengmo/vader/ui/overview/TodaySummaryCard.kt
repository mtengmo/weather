package com.tengmo.vader.ui.overview

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.saveable.rememberSaveable
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
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R
import com.tengmo.vader.data.model.DailyAggregate
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.UnitSystem
import com.tengmo.vader.data.model.WeatherCondition
import com.tengmo.vader.data.model.WeatherWarning
import com.tengmo.vader.data.repository.ObservationIcon
import com.tengmo.vader.data.repository.RestOfDayAggregate
import com.tengmo.vader.data.repository.WeatherConditionInput
import com.tengmo.vader.theme.LocalNoticeColors
import com.tengmo.vader.data.repository.convertPrecipitation
import com.tengmo.vader.data.repository.convertTemperature
import com.tengmo.vader.data.repository.convertWindSpeed
import com.tengmo.vader.data.repository.deriveWeatherCondition
import com.tengmo.vader.data.repository.directionToCompass
import com.tengmo.vader.data.repository.formatValue
import com.tengmo.vader.data.repository.getMoonPhase
import com.tengmo.vader.data.repository.getSunTimes
import com.tengmo.vader.data.repository.isNight
import com.tengmo.vader.data.repository.isWindy
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
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TodaySummaryCard(
    today: DailyAggregate?,
    unit: UnitSystem,
    location: Location,
    currentIcon: ObservationIcon?,
    currentTemperature: Double?,
    currentFeelsLike: Double?,
    restOfDay: RestOfDayAggregate?,
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
    val condition = currentIcon?.condition ?: dayCondition
    val windy = currentIcon?.windy ?: isWindy(today.windAverage)
    // Falls back to today's high/low midpoint when there's no current reading, rather than
    // omitting the icon/character outright (061-cartoon-weather-companion, US3).
    val characterTemperature = currentTemperature
        ?: if (today.high != null && today.low != null) (today.high + today.low) / 2 else null

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
    val compass = restOfDay?.windDirection?.let { " ${directionToCompass(it)}" } ?: ""
    val facts = buildList {
        add(
            stringResource(R.string.todaySummary_rain) to
                "${formatValue(convertPrecipitation(restOfDay?.totalPrecipitation, unit), 1)} ${precipitationUnitLabel(unit)}",
        )
        add(
            stringResource(R.string.todaySummary_wind) to
                "${formatValue(convertWindSpeed(restOfDay?.windAverage, unit), 0)} ${windUnitLabel(unit)}$compass",
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

    var expanded by rememberSaveable { mutableStateOf(false) }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 0.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    WeatherIconImage(
                        // Same inputs as the timeline's column for this observation (observationIcon).
                        smhiSymbolCode = currentIcon?.smhiSymbolCode,
                        condition = condition,
                        isNight = currentIcon?.isNight ?: isNight(Instant.now().toString()),
                        temperatureCelsius = characterTemperature,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        windy = windy,
                        skyCondition = currentIcon?.skyCondition,
                    )
                    CompanionCharacterImage(
                        condition = condition,
                        temperatureCelsius = characterTemperature,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                    )
                }
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .semantics(mergeDescendants = true) {
                            heading()
                            contentDescription = headlineDescription
                        },
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (nowText != null) {
                        Text(
                            "$nowText°",
                            style = MaterialTheme.typography.displayMedium,
                            maxLines = 1,
                            softWrap = false,
                        )
                    }
                    Column(Modifier.weight(1f, fill = false)) {
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
            }

            val restOfDayLabel = stringResource(R.string.todaySummary_restOfDay)
            val summaryDescription = buildString {
                append(restOfDayLabel)
                (listOf(
                    stringResource(R.string.todaySummary_high) to "${formatValue(convertTemperature(restOfDay?.high, unit), 0)}°",
                    stringResource(R.string.todaySummary_low) to "${formatValue(convertTemperature(restOfDay?.low, unit), 0)}°",
                ) + facts.take(2)).forEach { (l, v) -> append(". $l $v") }
            }
            FlowRow(
                modifier = Modifier.fillMaxWidth().semantics(mergeDescendants = true) {
                    contentDescription = summaryDescription
                },
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                LabelValue(stringResource(R.string.todaySummary_high), "${formatValue(convertTemperature(restOfDay?.high, unit), 0)}°")
                LabelValue(stringResource(R.string.todaySummary_low), "${formatValue(convertTemperature(restOfDay?.low, unit), 0)}°")
                facts.take(2).forEach { (l, v) -> LabelValue(l, v) }
            }

            val moreStateText = stringResource(
                if (expanded) R.string.todaySummary_noticeExpanded else R.string.todaySummary_noticeCollapsed,
            )
            val badgeText = stringResource(R.string.todaySummary_noticesBadge, informationalWarnings.size)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .semantics { stateDescription = moreStateText }
                    .clickable(role = Role.Button) { expanded = !expanded },
                contentAlignment = Alignment.Center,
            ) {
            Text(
                restOfDayLabel,
                style = MaterialTheme.typography.labelSmall,
                color = muted,
                modifier = Modifier.align(Alignment.CenterStart),
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
            ) {
                Text(
                    stringResource(if (expanded) R.string.todaySummary_less else R.string.todaySummary_more),
                    style = MaterialTheme.typography.labelLarge,
                    color = muted,
                )
                if (informationalWarnings.isNotEmpty() && !expanded) {
                    Box(
                        Modifier
                            .size(8.dp)
                            .background(LocalNoticeColors.current.marker, CircleShape)
                            .semantics { contentDescription = badgeText },
                    )
                }
                Image(
                    painter = painterResource(R.drawable.ic_expand_more),
                    contentDescription = null,
                    colorFilter = ColorFilter.tint(muted),
                    modifier = Modifier.size(24.dp).rotate(if (expanded) 180f else 0f),
                )
            }
            }

            if (expanded) {
            Column(Modifier.padding(bottom = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                pairUp(facts.drop(2)).forEach { rowItems ->
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
                            Box(Modifier.size(8.dp).background(LocalNoticeColors.current.marker, CircleShape))
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
    }
}

@Composable
private fun LabelValue(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyLarge)
    }
}
