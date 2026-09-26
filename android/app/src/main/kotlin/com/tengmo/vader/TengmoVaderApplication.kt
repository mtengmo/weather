package com.tengmo.vader

import android.app.Application
import com.tengmo.vader.data.model.WidgetTargetKind
import com.tengmo.vader.location.SignificantLocationTracker
import com.tengmo.vader.location.hasBackgroundLocationPermission
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/** T029 support — application entry point; dependency wiring lives in [ServiceLocator], created
 *  lazily on first use rather than here, so nothing does network/disk work before it's needed.
 *
 *  One thing does happen on every process start: significant-location-change updates registered
 *  with the OS do not survive a reboot or an app update, so if any "My location" widget exists and
 *  background location is allowed, tracking is (re)started here. WorkManager's own periodic widget
 *  refresh survives reboots and starts this process, which is what brings tracking back after one
 *  without the user having to open the app (SC-011). */
class TengmoVaderApplication : Application() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()
        scope.launch {
            runCatching {
                val store = ServiceLocator.get(this@TengmoVaderApplication).widgetTargetStore
                val hasMyLocationWidget = store.allWidgetIds().any { store.getTarget(it)?.kind == WidgetTargetKind.MyLocation }
                if (hasMyLocationWidget && hasBackgroundLocationPermission(this@TengmoVaderApplication)) {
                    SignificantLocationTracker.start(this@TengmoVaderApplication)
                }
            }
        }
    }
}
