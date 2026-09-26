package com.tengmo.vader.widget

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.tengmo.vader.R

/**
 * T066 — the non-weather states shared by both widget sizes:
 *  - **Place removed** (FR-030): the favorite this widget showed was deleted in the app — a clear
 *    "place removed — tap to choose another" instead of stale data; tapping reopens the widget's
 *    configuration.
 *  - **Loading** (just added / no data yet / offline since adding): shows the place if known, plus
 *    the location-permission hint for a "My location" widget that was denied (FR-028).
 *  - **Not configured**: configuration was cancelled — tapping lets the user finish it.
 */
@Composable
fun WidgetPlaceholder(render: WidgetRender, base: GlanceModifier) {
    val ctx = render.localizedContext
    val onTap = reconfigureAction(ctx, render.appWidgetId)
    val title = TextStyle(color = ColorProvider(render.textColor), fontSize = 14.sp, fontWeight = FontWeight.Bold)
    val body = TextStyle(color = ColorProvider(render.mutedColor), fontSize = 12.sp)

    Column(
        modifier = base.clickable(onTap),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        when (val state = render.state) {
            is WidgetState.PlaceRemoved -> {
                Text(ctx.getString(R.string.widget_placeRemoved), style = title)
                Text(ctx.getString(R.string.widget_placeRemovedAction), style = body)
            }
            is WidgetState.Loading -> {
                Text(state.placeName ?: ctx.getString(R.string.app_name), style = title, maxLines = 1)
                Text(ctx.getString(R.string.launch_loading), style = body)
                if (state.permissionNeeded) {
                    Text(
                        ctx.getString(R.string.widget_permissionNeeded),
                        style = TextStyle(color = ColorProvider(render.accentColor), fontSize = 11.sp),
                    )
                }
            }
            is WidgetState.NotConfigured -> {
                Text(ctx.getString(R.string.widget_chooseTarget), style = title)
            }
            is WidgetState.Weather -> Unit // handled by the size-specific content
        }
    }
}
