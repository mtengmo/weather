package com.tengmo.vader.ui.sea

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
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
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.SeaMetric
import com.tengmo.vader.data.model.UnitSystem
import com.tengmo.vader.data.repository.ObservationIcon
import com.tengmo.vader.data.repository.SeaSummary
import com.tengmo.vader.data.repository.convertTemperature
import com.tengmo.vader.data.repository.convertWindSpeed
import com.tengmo.vader.data.repository.directionToCompass
import com.tengmo.vader.data.repository.formatValue
import com.tengmo.vader.data.repository.getSunTimes
import com.tengmo.vader.data.repository.isNight
import com.tengmo.vader.data.repository.isWindy
import com.tengmo.vader.data.repository.windUnitLabel
import com.tengmo.vader.data.source.SmhiOceanSource
import com.tengmo.vader.ui.TimeFormat
import com.tengmo.vader.ui.appLocale
import com.tengmo.vader.ui.overview.CompanionCharacterImage
import com.tengmo.vader.ui.overview.WeatherIconImage
import com.tengmo.vader.ui.overview.conditionStringKey
import com.tengmo.vader.ui.overview.pairUp
import com.tengmo.vader.ui.stringByName
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** A station that supplied observations, with the time of its latest reading (epoch ms). */
data class SeaStationInfo(val name: String, val distanceKm: Double, val time: Long)

private data class Fact(val key: String, val label: String, val value: String, val compass: String? = null, val source: String? = null)

private fun compassOf(degrees: Double?): String? = degrees?.let { directionToCompass(it) }

/**
 * "At sea now" card (port of SeaSummaryCard.tsx): the current weather icon and companion character,
 * the main sea facts (wind, waves, sea temperature, water level) with their source, expandable
 * details, the observing stations and a link to SMHI's sea forecast.
 */
@Composable
fun SeaSummaryCard(
    summary: SeaSummary,
    unit: UnitSystem,
    location: Location,
    stations: List<SeaStationInfo>,
    metricStations: Map<SeaMetric, SeaStationInfo>,
    currentIcon: ObservationIcon?,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val locale = appLocale()
    val zone = ZoneId.systemDefault()
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    var expanded by rememberSaveable { mutableStateOf(false) }

    val condition = currentIcon?.condition
    val temperature = currentIcon?.temperature
    val conditionLabel = condition?.let { stringByName(conditionStringKey(it)) } ?: "—"
    val speedUnit = windUnitLabel(unit)

    fun speed(ms: Double, decimals: Int = 0) = formatValue(convertWindSpeed(ms, unit), decimals)
    fun clock(ms: Long) = TimeFormat.clock(Instant.ofEpochMilli(ms).atZone(zone), locale)

    val modelSource = stringResource(R.string.seaWeather_modelSource)
    fun sourceFor(metric: SeaMetric, observed: Boolean): String {
        val st = metricStations[metric]
        return if (observed && st != null) {
            context.getString(R.string.seaWeather_stationSub, st.name, Math.round(st.distanceKm).toString())
        } else {
            modelSource
        }
    }

    val facts = buildList {
        summary.wind?.let { w ->
            add(
                Fact(
                    "wind", stringResource(R.string.seaWeather_wind),
                    "${speed(w.speed)}${w.gust?.let { " (${speed(it)})" }.orEmpty()} $speedUnit", compassOf(w.direction),
                ),
            )
        }
        summary.waves?.let { w ->
            add(
                Fact(
                    "waves", stringResource(R.string.seaWeather_waves),
                    seaHeightText(w.height, unit) + seaPeriodSuffix(w.period), compassOf(w.direction),
                    sourceFor(SeaMetric.WaveHeight, w.observed),
                ),
            )
        }
        summary.seaTemperature?.let { t ->
            add(
                Fact(
                    "seaTemperature", stringResource(R.string.seaWeather_seaTemperature),
                    "${formatValue(convertTemperature(t.value, unit), 1)}°", null,
                    sourceFor(SeaMetric.SeaTemperature, t.observed),
                ),
            )
        }
        summary.waterLevel?.let { l ->
            add(
                Fact(
                    "waterLevel", stringResource(R.string.seaWeather_waterLevel),
                    seaLevelWithUnit(l.value, unit), null, sourceFor(SeaMetric.WaterLevel, l.observed),
                ),
            )
        }
    }

    val (sunrise, sunset) = getSunTimes(location.latitude, location.longitude, LocalDate.now())
    fun sun(i: Instant?) = i?.let { TimeFormat.clock(it.atZone(zone), locale) } ?: "—"

    val details = buildList {
        summary.swell?.let { s ->
            add(Fact("swell", stringResource(R.string.seaWeather_swell), seaHeightText(s.height, unit) + seaPeriodSuffix(s.period), compassOf(s.direction)))
        }
        summary.windWaveHeight?.let {
            add(Fact("windWaves", stringResource(R.string.seaWeather_windWaves), seaHeightText(it, unit)))
        }
        summary.current?.let { c ->
            // A current is described by where it flows TOWARD.
            add(Fact("current", stringResource(R.string.seaWeather_current), "${speed(c.speed, 1)} $speedUnit", compassOf(c.direction)))
        }
        summary.next24h.maxWave?.let { m ->
            add(Fact("maxWave", stringResource(R.string.seaWeather_maxWave24h), "${seaHeightText(m.value, unit)}, ${clock(m.time)}"))
        }
        summary.next24h.maxGust?.let { g ->
            add(Fact("maxGust", stringResource(R.string.seaWeather_maxGust24h), "${speed(g.value)} $speedUnit, ${clock(g.time)}"))
        }
        val lo = summary.next24h.waterLevelMin
        val hi = summary.next24h.waterLevelMax
        if (lo != null && hi != null) {
            add(Fact("levelRange", stringResource(R.string.seaWeather_waterLevelRange24h), seaLevelRangeText(lo, hi, unit)))
        }
        add(Fact("sunrise", stringResource(R.string.todaySummary_sunrise), sun(sunrise)))
        add(Fact("sunset", stringResource(R.string.todaySummary_sunset), sun(sunset)))
    }

    val skyWindy = isWindy(summary.wind?.speed)
    val isNightNow = currentIcon?.isNight ?: isNight(Instant.now().toString())
    val title = stringResource(R.string.seaWeather_summaryTitle)

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(title, style = MaterialTheme.typography.labelMedium, color = muted)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    WeatherIconImage(
                        smhiSymbolCode = currentIcon?.smhiSymbolCode,
                        condition = condition,
                        isNight = isNightNow,
                        temperatureCelsius = temperature,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        windy = skyWindy,
                        skyCondition = currentIcon?.skyCondition,
                    )
                    CompanionCharacterImage(
                        condition = condition,
                        temperatureCelsius = temperature,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                    )
                }
                Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (temperature != null) {
                        Text(
                            "${formatValue(convertTemperature(temperature, unit), 0)}°",
                            style = MaterialTheme.typography.displayMedium,
                            maxLines = 1,
                            softWrap = false,
                        )
                    }
                    Text(conditionLabel, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f, fill = false))
                }
            }

            pairUp(facts).forEach { rowItems ->
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    rowItems.forEach { f -> FactCell(f, Modifier.weight(1f)) }
                    if (rowItems.size == 1) Spacer(Modifier.weight(1f))
                }
            }

            val stateText = stringResource(if (expanded) R.string.todaySummary_noticeExpanded else R.string.todaySummary_noticeCollapsed)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .semantics { stateDescription = stateText }
                    .clickable(role = Role.Button) { expanded = !expanded },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
            ) {
                Text(
                    stringResource(if (expanded) R.string.todaySummary_less else R.string.todaySummary_more),
                    style = MaterialTheme.typography.labelLarge,
                    color = muted,
                )
                Image(
                    painter = painterResource(R.drawable.ic_expand_more),
                    contentDescription = null,
                    colorFilter = ColorFilter.tint(muted),
                    modifier = Modifier.size(24.dp).rotate(if (expanded) 180f else 0f),
                )
            }

            if (expanded) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    pairUp(details).forEach { rowItems ->
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            rowItems.forEach { d -> FactCell(d, Modifier.weight(1f)) }
                            if (rowItems.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                    if (stations.isNotEmpty()) {
                        Column {
                            Text(stringResource(R.string.seaWeather_stations), style = MaterialTheme.typography.labelMedium, color = muted)
                            stations.forEach { s ->
                                Text(
                                    context.getString(R.string.seaWeather_stationAt, s.name, Math.round(s.distanceKm).toString(), clock(s.time)),
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                            }
                        }
                    }
                }
            }

            Text(stringResource(R.string.seaWeather_sourceNote), style = MaterialTheme.typography.labelSmall, color = muted)
            TextButton(
                onClick = {
                    // No browser installed is the only failure; nothing useful to do then.
                    try {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(SmhiOceanSource.SEA_WEATHER_URL)))
                    } catch (_: ActivityNotFoundException) {
                    }
                },
                modifier = Modifier.heightIn(min = 48.dp),
            ) { Text(stringResource(R.string.seaWeather_forecastLink)) }
        }
    }
}

@Composable
private fun FactCell(fact: Fact, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(fact.label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(fact.value + (fact.compass?.let { " $it" } ?: ""), style = MaterialTheme.typography.bodyLarge)
        fact.source?.let {
            Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
