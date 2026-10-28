package com.tengmo.vader.data.model

import com.tengmo.vader.data.source.GeoGeometry

// Models for the "Kustväder" sea weather page (ports of the types in src/services/
// seaForecast.ts, seaObservations.ts, seaReport.ts).

/**
 * One hour of marine model data. Every field except [time] may be null.
 * Directions are degrees: [waveDirection] and [swellWaveDirection] are where the waves come FROM;
 * [currentDirection] is where the current is going TOWARD.
 */
data class MarineHour(
    /** Epoch ms. */
    val time: Long,
    val waveHeight: Double? = null, // m
    val waveDirection: Double? = null,
    val wavePeriod: Double? = null, // s
    val windWaveHeight: Double? = null,
    val swellWaveHeight: Double? = null,
    val swellWaveDirection: Double? = null,
    val swellWavePeriod: Double? = null,
    val seaTemperature: Double? = null, // deg C
    val seaLevelCm: Double? = null, // cm relative to mean sea level
    val currentSpeed: Double? = null, // m/s
    val currentDirection: Double? = null,
)

data class MarineForecast(val hours: List<MarineHour>)

/** SMHI oceanographic observation parameters we show. */
enum class SeaMetric(val parameter: Int) {
    WaterLevel(12),
    WaveHeight(1),
    SeaTemperature(5),
}

data class SeaStation(val key: String, val name: String, val distanceKm: Double)

data class SeaPoint(val time: Long, val value: Double)

data class SeaObservation(val metric: SeaMetric, val station: SeaStation, val points: List<SeaPoint>)

data class CoastalArea(val id: Int, val name: String, val seaDistricts: List<Int>, val geometry: GeoGeometry)

data class SeaDistrictText(val ids: List<Int>, val text: String)

data class SeaReportTexts(val overview: String, val updated: String?, val districts: List<SeaDistrictText>)

data class WindText(val prefix: String?, val text: String)

data class AreaForecast(val id: Int, val name: String, val sky: String?, val winds: List<WindText>)

data class SeaReportRaw(val texts: SeaReportTexts, val areas: List<CoastalArea>, val forecasts: List<AreaForecast>)

data class SeaForecastView(val sky: String?, val winds: List<WindText>)

data class SeaReportView(
    val overview: String,
    val updated: String?,
    val areaName: String?,
    val areaTexts: List<String>,
    val forecast: SeaForecastView?,
)
