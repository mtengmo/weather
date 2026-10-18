package com.tengmo.vader.location

import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.LocationSource
import com.tengmo.vader.data.model.needsNameRepair

/**
 * Re-resolves a missing/placeholder name of the stored current position (cache first, then network
 * - the resolver does both) and persists the real name once. A good name is never overwritten, and a
 * failed lookup leaves everything untouched. Pure, so it is unit-testable without Android.
 */
class LocationNameRepair(
    private val resolveName: suspend (latitude: Double, longitude: Double, language: String) -> String?,
    private val readStored: suspend () -> Location?,
    private val persist: suspend (Location) -> Unit,
) {
    /** The repaired (and persisted) location, or null when nothing needed or could be done. */
    suspend fun repair(stored: Location, language: String): Location? {
        if (!stored.needsNameRepair()) return null
        val name = resolveName(stored.latitude, stored.longitude, language)?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        // Re-read: persist only if the user did not pick something else / a name did not arrive meanwhile.
        val current = readStored() ?: return null
        if (current.source != LocationSource.CurrentPosition || !current.needsNameRepair() ||
            current.latitude != stored.latitude || current.longitude != stored.longitude
        ) {
            return null
        }
        val fixed = current.copy(displayName = name)
        persist(fixed)
        return fixed
    }
}

/**
 * Background "follow my location" step: when the selected place is the current position and the
 * phone's last-known coarse fix moved at least [LocationFollowPolicy.MIN_MOVE_M], returns and
 * persists the new current position. Never touches a favorite/map selection.
 */
class BackgroundLocationFollower(
    private val resolveLocation: suspend (latitude: Double, longitude: Double, language: String) -> Location,
    private val persist: suspend (Location) -> Unit,
) {
    data class Fix(val latitude: Double, val longitude: Double, val ageMs: Long, val accuracyMeters: Float?)

    suspend fun follow(stored: Location?, fix: Fix?, language: String): Location? {
        if (stored == null || stored.source != LocationSource.CurrentPosition || fix == null) return null
        if (!LocationFollowPolicy.isUsable(fix.ageMs, fix.accuracyMeters)) return null
        if (!LocationFollowPolicy.hasMoved(stored.latitude, stored.longitude, fix.latitude, fix.longitude)) return null
        val moved = resolveLocation(fix.latitude, fix.longitude, language)
        persist(moved)
        return moved
    }
}
