package com.tengmo.vader.data.model

import kotlinx.serialization.Serializable

// T011 — mirrors web's WeatherWarning (data-model.md "WeatherWarning"), reduced from SMHI's
// Impact-Based Weather Warnings feed to what the UI needs (FR-004).
@Serializable
data class WeatherWarning(
    val id: String,
    val severityCode: String, // SMHI's own level code, e.g. "MESSAGE"/"YELLOW"/"ORANGE"/"RED"
    val severityLabel: String,
    val title: String,
    val areaName: String,
    val description: String,
    val validFrom: String, // ISO-8601
    val validUntil: String?, // null = "no stated end — still active per the feed's presence"
    val isActive: Boolean, // true when validFrom <= now
    val isInformational: Boolean, // true for SMHI's lowest "Message" severity
)
