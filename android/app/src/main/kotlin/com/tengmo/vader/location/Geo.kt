package com.tengmo.vader.location

import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/** Great-circle distance in metres (haversine). */
fun haversineMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val r = 6_371_000.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2).pow(2)
    return 2 * r * asin(sqrt(a))
}

/** Pure decision for the background "follow my location" step. */
object LocationFollowPolicy {
    const val MAX_AGE_MS = 24L * 60 * 60 * 1000
    const val MAX_ACCURACY_M = 5_000f
    const val MIN_MOVE_M = 2_000.0

    /** A last-known fix is usable when fresh enough and not too imprecise (unknown accuracy passes). */
    fun isUsable(ageMs: Long, accuracyM: Float?): Boolean =
        ageMs in 0..MAX_AGE_MS && (accuracyM == null || accuracyM <= MAX_ACCURACY_M)

    fun hasMoved(fromLat: Double, fromLon: Double, toLat: Double, toLon: Double): Boolean =
        haversineMeters(fromLat, fromLon, toLat, toLon) >= MIN_MOVE_M
}
