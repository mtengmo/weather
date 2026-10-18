package com.tengmo.vader.data.repository

/**
 * SMHI appends an " Aut" (automatic station) or " A" marker to some station names, e.g.
 * "Uppsala Aut". Drops only that trailing marker, for display. Case-sensitive on purpose, to match
 * SMHI's exact convention. A name that is nothing but the marker is returned unchanged.
 * Mirrors `stripStationAutoSuffix` in src/services/locationName.ts.
 */
private val AUTO_STATION_SUFFIX = Regex("""^(.*\S)\s+(?:Aut|A)$""")

fun stripStationAutoSuffix(stationName: String): String =
    AUTO_STATION_SUFFIX.find(stationName)?.groupValues?.get(1) ?: stationName
