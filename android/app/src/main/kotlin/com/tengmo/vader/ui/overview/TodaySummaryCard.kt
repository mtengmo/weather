package com.tengmo.vader.ui.overview

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.clickable
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
import java.time.format.DateTimeFormatter

private val TIME_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")

private fun formatTime(instant: Instant?): String =
    instant?.atZone(ZoneId.systemDefault())?.format(TIME_FORMAT) ?: "—"

/** T033 — port of src/components/TodaySummaryCard.tsx: persistent "Today" summary with
 *  high/low, description, rain, wind+compass, sunrise/sunset, moon phase, humidity level, and
 *  any informational (Message-level) warnings. */
@OptIn(ExperimentalLayoutApi::class)
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

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                WeatherIconImage(
                    smhiSymbolCode = null,
                    condition = condition,
                    isNight = isNight(Instant.now().toString()),
                    temperatureCelsius = characterTemperature,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                )
                CompanionCharacterImage(
                    condition = condition,
                    temperatureCelsius = characterTemperature,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                )
            }

            FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                if (currentTemperature != null) {
                    val nowText = buildString {
                        append("${stringResource(R.string.todaySummary_now)} ${formatValue(convertTemperature(currentTemperature, unit), 0)}°")
                        if (currentFeelsLike != null) {
                            append(" (${stringResource(R.string.todaySummary_feelsLike)} ${formatValue(convertTemperature(currentFeelsLike, unit), 0)}°)")
                        }
                    }
                    Text(nowText, fontSize = 16.sp)
                }
                Text("${stringResource(R.string.todaySummary_high)} ${formatValue(convertTemperature(today.high, unit), 0)}°")
                Text("${stringResource(R.string.todaySummary_low)} ${formatValue(convertTemperature(today.low, unit), 0)}°")
            }

            FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "${stringResource(R.string.todaySummary_rain)} ${formatValue(convertPrecipitation(rainTotal, unit), 1)} ${precipitationUnitLabel(unit)}",
                )
                val compass = today.windDirection?.let { " ${directionToCompass(it)}" } ?: ""
                Text(
                    "${stringResource(R.string.todaySummary_wind)} ${formatValue(convertWindSpeed(today.windAverage, unit), 0)} ${windUnitLabel(unit)}$compass",
                )
            }

            FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("${stringResource(R.string.todaySummary_sunrise)} ${formatTime(sunrise)}")
                Text("${stringResource(R.string.todaySummary_sunset)} ${formatTime(sunset)}")
                Text("${stringResource(R.string.todaySummary_moon)} ${stringByName(moonPhase.stringKey)}")
                if (currentHumidity != null) {
                    val levelKey = when {
                        currentHumidity < 30 -> R.string.todaySummary_humidityDry
                        currentHumidity <= 70 -> R.string.todaySummary_humidityNormal
                        else -> R.string.todaySummary_humidityHigh
                    }
                    Text("${stringResource(R.string.todaySummary_humidity)} ${stringResource(levelKey)}")
                }
            }

            informationalWarnings.forEach { warning ->
                val expanded = warning.id in expandedNoticeIds
                Column {
                    Text(
                        warning.title,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.clickable {
                            expandedNoticeIds = if (expanded) expandedNoticeIds - warning.id else expandedNoticeIds + warning.id
                        },
                    )
                    if (expanded) Text(warning.description, fontSize = 13.sp)
                }
            }
        }
    }
}
