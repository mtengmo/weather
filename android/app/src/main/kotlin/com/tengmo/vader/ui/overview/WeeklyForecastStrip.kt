package com.tengmo.vader.ui.overview

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tengmo.vader.data.model.DailyAggregate
import com.tengmo.vader.data.model.UnitSystem
import com.tengmo.vader.data.repository.convertTemperature
import com.tengmo.vader.data.repository.deriveDailyCondition
import com.tengmo.vader.data.repository.formatValue
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/** T034 — port of src/components/WeeklyForecastStrip.tsx: one card per day
 *  `toDailyAggregates` returned, never fabricated beyond that (018-dashboard-visual-redesign,
 *  US5). Shares `deriveDailyCondition` with the 7-day overview so the two can't drift apart on
 *  whether a given day shows rain (069-fix-7day-graph-rain). */
@Composable
fun WeeklyForecastStrip(days: List<DailyAggregate>, unit: UnitSystem, modifier: Modifier = Modifier) {
    if (days.isEmpty()) return
    val weekdayFormat = DateTimeFormatter.ofPattern("EEE", Locale.getDefault())

    LazyRow(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(days, key = { it.bucketEnd }) { day ->
            val condition = deriveDailyCondition(day)
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(vertical = 8.dp, horizontal = 4.dp),
            ) {
                Text(
                    Instant.parse(day.bucketEnd).atZone(ZoneId.systemDefault()).format(weekdayFormat),
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 13.sp,
                )
                WeatherIconImage(
                    smhiSymbolCode = null,
                    condition = condition,
                    isNight = false,
                    temperatureCelsius = day.average,
                    contentDescription = null,
                    modifier = Modifier.size(44.dp),
                )
                Row {
                    Text(
                        "${formatValue(convertTemperature(day.high, unit), 0)}° / ${formatValue(convertTemperature(day.low, unit), 0)}°",
                        fontSize = 12.sp,
                    )
                }
            }
        }
    }
}
