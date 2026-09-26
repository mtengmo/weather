package com.tengmo.vader.widget

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.Action
import androidx.glance.action.clickable
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.tengmo.vader.R
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.UnitSystem
import com.tengmo.vader.data.model.WeatherObservation
import com.tengmo.vader.data.repository.convertTemperature
import com.tengmo.vader.data.repository.formatValue
import com.tengmo.vader.data.repository.isNight
import com.tengmo.vader.data.repository.temperatureUnitLabel
import com.tengmo.vader.ui.overview.resolveWeatherIconRes
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val TIME_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")
private val HOUR_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("HH")

/** Data older than this is called out with an explicit "Updated HH:mm" even on the small widget,
 *  so stale data is recognizable (spec Edge Cases: power-restricted mode). */
private const val STALE_AFTER_MS = 60 * 60_000L

private fun colorProvider(color: Color) = ColorProvider(color)

private fun temp(value: Double?, unit: UnitSystem): String =
    "${formatValue(convertTemperature(value, unit), 0)}°"

private fun updatedText(context: Context, loadedAtIso: String): String =
    context.getString(
        R.string.widget_lastUpdated,
        Instant.parse(loadedAtIso).atZone(ZoneId.systemDefault()).format(TIME_FORMAT),
    )

private fun isStale(loadedAtIso: String): Boolean =
    System.currentTimeMillis() - Instant.parse(loadedAtIso).toEpochMilli() > STALE_AFTER_MS

/** The action for tapping a normal (weather) widget: open the app on the Overview of the place
 *  the widget shows (FR-024). */
fun openAppAction(context: Context, location: Location?): Action =
    actionStartActivity(WidgetTapHandler.overviewIntent(context, location))

/** The action for tapping a widget that needs the user to choose/grant something: reopens the
 *  widget's own configuration (FR-028 grant permission, FR-030 choose another place). */
fun reconfigureAction(context: Context, appWidgetId: Int): Action =
    actionStartActivity(WidgetConfigureActivity.reconfigureIntent(context, appWidgetId))

private fun fallbackIcon(): Int = R.mipmap.ic_launcher_foreground

@Composable
private fun WeatherIcon(render: WidgetRender, weather: WidgetState.Weather, size: Int) {
    val summary = weather.snapshot.currentConditionSummary
    val res = resolveWeatherIconRes(
        render.localizedContext,
        summary.smhiSymbolCode,
        summary.condition,
        isNight(Instant.now().toString()),
        summary.temperature,
    )
    Image(
        provider = ImageProvider(if (res != 0) res else fallbackIcon()),
        contentDescription = null,
        modifier = GlanceModifier.size(size.dp),
    )
}

/**
 * T064 / FR-021 — small widget: current weather icon, current temperature, place name. The
 * [permissionNeeded] hint (FR-028) and stale-data note are the only extras, so it stays glanceable.
 */
@Composable
fun SmallWidgetContent(render: WidgetRender) {
    val base = GlanceModifier.fillMaxSize().cornerRadius(16.dp).background(colorProvider(render.background)).padding(8.dp)
    when (val state = render.state) {
        is WidgetState.Weather -> {
            val summary = state.snapshot.currentConditionSummary
            Column(
                modifier = base.clickable(openAppAction(render.localizedContext, state.snapshot.location)),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    state.snapshot.location.displayName,
                    style = TextStyle(color = colorProvider(render.mutedColor), fontSize = 12.sp),
                    maxLines = 1,
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    WeatherIcon(render, state, size = 44)
                    Spacer(GlanceModifier.width(6.dp))
                    Text(
                        temp(summary.temperature, render.preferences.unit),
                        style = TextStyle(color = colorProvider(render.textColor), fontSize = 28.sp, fontWeight = FontWeight.Bold),
                    )
                }
                if (state.permissionNeeded) {
                    Text(
                        render.localizedContext.getString(R.string.widget_permissionNeeded),
                        style = TextStyle(color = colorProvider(render.accentColor), fontSize = 10.sp),
                        modifier = GlanceModifier.clickable(reconfigureAction(render.localizedContext, render.appWidgetId)),
                        maxLines = 1,
                    )
                } else if (isStale(state.snapshot.loadedAt)) {
                    Text(
                        updatedText(render.localizedContext, state.snapshot.loadedAt),
                        style = TextStyle(color = colorProvider(render.mutedColor), fontSize = 10.sp),
                        maxLines = 1,
                    )
                }
            }
        }
        else -> WidgetPlaceholder(render, base)
    }
}

/**
 * T065 / FR-022 — medium widget: the small widget's content plus today's high/low, today's rain
 * chance, and a strip of the next few hours (icon + temperature per hour).
 */
@Composable
fun MediumWidgetContent(render: WidgetRender) {
    val base = GlanceModifier.fillMaxSize().cornerRadius(16.dp).background(colorProvider(render.background)).padding(10.dp)
    when (val state = render.state) {
        is WidgetState.Weather -> {
            val summary = state.snapshot.currentConditionSummary
            val unit = render.preferences.unit
            Column(
                modifier = base.clickable(openAppAction(render.localizedContext, state.snapshot.location)),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Row 1: icon + temperature + place / high-low / rain chance.
                Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    WeatherIcon(render, state, size = 48)
                    Spacer(GlanceModifier.width(8.dp))
                    Column {
                        Text(
                            temp(summary.temperature, unit),
                            style = TextStyle(color = colorProvider(render.textColor), fontSize = 28.sp, fontWeight = FontWeight.Bold),
                        )
                        Text(
                            state.snapshot.location.displayName,
                            style = TextStyle(color = colorProvider(render.mutedColor), fontSize = 12.sp),
                            maxLines = 1,
                        )
                    }
                    Spacer(GlanceModifier.width(12.dp))
                    Column {
                        Text(
                            "${render.localizedContext.getString(R.string.todaySummary_high)} ${temp(summary.high, unit)}  " +
                                "${render.localizedContext.getString(R.string.todaySummary_low)} ${temp(summary.low, unit)}",
                            style = TextStyle(color = colorProvider(render.textColor), fontSize = 12.sp),
                            maxLines = 1,
                        )
                        summary.chanceOfRain?.let {
                            Text(
                                "${render.localizedContext.getString(R.string.weatherOverview_probability)} $it%",
                                style = TextStyle(color = colorProvider(render.textColor), fontSize = 12.sp),
                                maxLines = 1,
                            )
                        }
                    }
                }

                // Row 2: next hours strip.
                Row(modifier = GlanceModifier.fillMaxWidth().padding(top = 6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    summary.nextHours.forEach { hour -> HourCell(render, hour, unit) }
                }

                // Footer: permission hint (FR-028) or last-updated time.
                if (state.permissionNeeded) {
                    Text(
                        render.localizedContext.getString(R.string.widget_permissionNeededAction),
                        style = TextStyle(color = colorProvider(render.accentColor), fontSize = 10.sp),
                        modifier = GlanceModifier.clickable(reconfigureAction(render.localizedContext, render.appWidgetId)),
                        maxLines = 1,
                    )
                } else {
                    Text(
                        updatedText(render.localizedContext, state.snapshot.loadedAt),
                        style = TextStyle(color = colorProvider(render.mutedColor), fontSize = 10.sp),
                        maxLines = 1,
                    )
                }
            }
        }
        else -> WidgetPlaceholder(render, base)
    }
}

@Composable
private fun HourCell(render: WidgetRender, obs: WeatherObservation, unit: UnitSystem) {
    val res = resolveWeatherIconRes(
        render.localizedContext, obs.smhiSymbolCode, obs.symbolCondition, isNight(obs.timestamp), obs.temperature,
    )
    Column(
        modifier = GlanceModifier.padding(horizontal = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            Instant.parse(obs.timestamp).atZone(ZoneId.systemDefault()).format(HOUR_FORMAT),
            style = TextStyle(color = colorProvider(render.mutedColor), fontSize = 10.sp),
        )
        if (res != 0) Image(ImageProvider(res), contentDescription = null, modifier = GlanceModifier.size(24.dp))
        Text(
            "${formatValue(convertTemperature(obs.temperature, unit), 0)}${temperatureUnitLabel(unit).take(1)}",
            style = TextStyle(color = colorProvider(render.textColor), fontSize = 11.sp),
        )
    }
}

/** Helper so the widget classes can rebuild the tap intent without importing android.content. */
internal fun Intent.withNewTask(): Intent = addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
