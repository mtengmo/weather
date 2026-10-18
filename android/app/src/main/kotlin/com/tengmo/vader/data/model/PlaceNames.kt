package com.tengmo.vader.data.model

/** The English placeholder older builds persisted when no name could be resolved. */
const val LEGACY_PLACEHOLDER_NAME = "Current location"

private val PLACEHOLDER_NAMES = setOf("current location", "my location", "min plats", "nuvarande plats", "aktuell plats")

/** True for a blank name or any known placeholder (never a real place name). */
fun isPlaceholderName(name: String?): Boolean =
    name == null || name.isBlank() || name.trim().lowercase() in PLACEHOLDER_NAMES

/** A current-position [Location] whose name is missing or a placeholder and so needs re-resolving. */
fun Location.needsNameRepair(): Boolean = source == LocationSource.CurrentPosition && isPlaceholderName(displayName)
