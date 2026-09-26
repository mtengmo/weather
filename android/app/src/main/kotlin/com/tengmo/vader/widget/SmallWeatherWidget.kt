package com.tengmo.vader.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.location.SignificantLocationTracker
import com.tengmo.vader.work.WidgetRefreshScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/** T064 / FR-021 — the small home-screen widget (icon, temperature, place name). */
class SmallWeatherWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val appWidgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)
        val render = loadWidgetRender(context, appWidgetId)
        provideContent { SmallWidgetContent(render) }
    }
}

class SmallWeatherWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = SmallWeatherWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        WidgetRefreshScheduler.ensureScheduled(context)
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)
        WidgetLifecycle.onWidgetsDeleted(context, appWidgetIds)
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        // Newly placed / restored widgets: fetch data straight away rather than wait for the period.
        WidgetRefreshScheduler.refreshNow(context)
    }
}

/** Cleanup shared by both widget receivers when the user removes widgets from the home screen
 *  (data-model.md "Widget" lifecycle): drop their stored targets/snapshots, and stop the
 *  background work and location tracking once no widget is left (SC-012: nothing keeps running
 *  for a widget that no longer exists). */
internal object WidgetLifecycle {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    fun onWidgetsDeleted(context: Context, appWidgetIds: IntArray) {
        val appContext = context.applicationContext
        scope.launch {
            runCatching {
                val services = ServiceLocator.get(appContext)
                appWidgetIds.forEach {
                    services.widgetTargetStore.removeTarget(it)
                    services.snapshotStore.removeWidgetSnapshot(it)
                }
                if (services.widgetTargetStore.allWidgetIds().isEmpty()) {
                    WidgetRefreshScheduler.cancel(appContext)
                    SignificantLocationTracker.stop(appContext)
                }
            }
        }
    }
}
