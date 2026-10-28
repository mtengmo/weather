package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.MarineHour
import com.tengmo.vader.data.model.SeaMetric
import com.tengmo.vader.data.model.SeaObservation
import com.tengmo.vader.data.model.UnitSystem
import com.tengmo.vader.data.model.WeatherObservation
import java.time.Instant
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

// Port of web src/components/seaTimelineData.ts: SMHI observations + Open-Meteo Marine model values
// merged on one hourly axis, aggregated into the shared timeline's columns, plus the summary card's
// numbers. Pure Kotlin (now is a parameter) so it is unit-testable.

private const val HOUR_MS = 3_600_000L
private const val HALF_HOUR_MS = 1_800_000L
private const val DAY_MS = 24 * HOUR_MS

/** Largest gap in SMHI readings that still counts as "covered" by an observation. */
private const val MAX_OBS_GAP_MS = 2 * HOUR_MS

/** An SMHI reading older than this no longer stands in for "now". */
private const val FRESH_OBS_MS = 3 * HOUR_MS

data class SeaSample(
    val time: Long,
    val value: Double,
    /** true when the value is an SMHI observation, false when it is a model value. */
    val observed: Boolean,
)

data class MergedSea(
    val waveHeight: List<SeaSample> = emptyList(),
    val wavePeriod: List<SeaSample> = emptyList(),
    val waveDirection: List<SeaSample> = emptyList(),
    val windWaveHeight: List<SeaSample> = emptyList(),
    val swellHeight: List<SeaSample> = emptyList(),
    val swellPeriod: List<SeaSample> = emptyList(),
    val swellDirection: List<SeaSample> = emptyList(),
    val seaTemperature: List<SeaSample> = emptyList(),
    val waterLevel: List<SeaSample> = emptyList(),
    val currentSpeed: List<SeaSample> = emptyList(),
    val currentDirection: List<SeaSample> = emptyList(),
)

typealias SeaObservations = Map<SeaMetric, SeaObservation?>

/** Index of the sample nearest [time] (earlier one on a tie); [sorted] must be non-empty and sorted. */
internal fun nearestIndex(times: List<Long>, time: Long): Int {
    var lo = 0
    var hi = times.size - 1
    while (lo < hi) {
        val mid = (lo + hi) shr 1
        if (times[mid] < time) lo = mid + 1 else hi = mid
    }
    if (lo > 0 && abs(times[lo - 1] - time) <= abs(times[lo] - time)) return lo - 1
    return lo
}

private fun List<SeaSample>.nearest(time: Long): SeaSample = this[nearestIndex(map { it.time }, time)]

private fun modelSeries(hours: List<MarineHour>, pick: (MarineHour) -> Double?): List<SeaSample> =
    hours.mapNotNull { h -> pick(h)?.let { SeaSample(h.time, it, observed = false) } }

/** Observed readings win inside the range they cover (nearest reading per hour); the model fills
 *  before that range and after the last reading. */
private fun mergeOne(obs: SeaObservation?, model: List<SeaSample>): List<SeaSample> {
    val points = obs?.points?.sortedBy { it.time }.orEmpty()
    if (points.isEmpty()) return model
    val pointTimes = points.map { it.time }
    val first = points.first().time
    val last = points.last().time

    val times = sortedSetOf<Long>()
    model.forEach { times.add(it.time) }
    for (p in points) times.add(Math.round(p.time.toDouble() / HOUR_MS) * HOUR_MS)
    val modelByTime = model.associateBy { it.time }

    val out = mutableListOf<SeaSample>()
    for (time in times) {
        if (time >= first - HALF_HOUR_MS && time <= last + HALF_HOUR_MS) {
            val p = points[nearestIndex(pointTimes, time)]
            if (abs(p.time - time) <= MAX_OBS_GAP_MS) {
                out += SeaSample(time, p.value, observed = true)
                continue
            }
        }
        modelByTime[time]?.let { out += it }
    }
    return out
}

fun mergeObservedAndModel(obs: SeaObservations, modelHours: List<MarineHour>): MergedSea {
    fun m(pick: (MarineHour) -> Double?) = modelSeries(modelHours, pick)
    return MergedSea(
        waveHeight = mergeOne(obs[SeaMetric.WaveHeight], m { it.waveHeight }),
        wavePeriod = m { it.wavePeriod },
        waveDirection = m { it.waveDirection },
        windWaveHeight = m { it.windWaveHeight },
        swellHeight = m { it.swellWaveHeight },
        swellPeriod = m { it.swellWavePeriod },
        swellDirection = m { it.swellWaveDirection },
        seaTemperature = mergeOne(obs[SeaMetric.SeaTemperature], m { it.seaTemperature }),
        waterLevel = mergeOne(obs[SeaMetric.WaterLevel], m { it.seaLevelCm }),
        currentSpeed = m { it.currentSpeed },
        currentDirection = m { it.currentDirection },
    )
}

/** Circular mean of directions in degrees, normalized to [0, 360). circularMean([350, 10]) == 0. */
fun circularMean(degrees: List<Double>): Double {
    var sinSum = 0.0
    var cosSum = 0.0
    for (d in degrees) {
        val r = Math.toRadians(d)
        sinSum += sin(r)
        cosSum += cos(r)
    }
    val deg = Math.round(Math.toDegrees(atan2(sinSum, cosSum)) * 1e6) / 1e6
    return ((deg % 360) + 360) % 360
}

enum class AggregateMethod { Max, Mean, Circular }

data class PeriodValue(
    val value: Double?,
    /** True for a past column made only of model values; forecast columns are never modelled. */
    val modelled: Boolean,
)

/** Column i covers (previous column end, own end]; the first column takes the next column's span. */
fun aggregateIntoPeriods(samples: List<SeaSample>, periods: List<TimelinePeriod>, method: AggregateMethod): List<PeriodValue> {
    val ends = periods.map { it.endMillis }
    val sampleTimes = samples.map { it.time }
    return periods.mapIndexed { i, period ->
        val end = ends[i]
        val span = if (i > 0) end - ends[i - 1] else if (ends.size > 1) ends[1] - ends[0] else HOUR_MS

        if (span <= HOUR_MS) {
            if (samples.isEmpty()) return@mapIndexed PeriodValue(null, false)
            val s = samples[nearestIndex(sampleTimes, end)]
            if (abs(s.time - end) > HALF_HOUR_MS) return@mapIndexed PeriodValue(null, false)
            return@mapIndexed PeriodValue(s.value, !s.observed && !period.isForecast)
        }

        val start = end - span
        val inside = samples.filter { it.time > start && it.time <= end }
        if (inside.isEmpty()) return@mapIndexed PeriodValue(null, false)
        val values = inside.map { it.value }
        val value = when (method) {
            AggregateMethod.Max -> values.max()
            AggregateMethod.Circular -> circularMean(values)
            AggregateMethod.Mean -> values.sum() / values.size
        }
        PeriodValue(value, !period.isForecast && inside.all { !it.observed })
    }
}

data class SeaRows(
    val waves: TimelineRow,
    val swell: TimelineRow,
    val seaTemperature: TimelineRow,
    val waterLevel: TimelineRow,
    /** Direction is where the current flows TOWARD. */
    val current: TimelineRow,
)

private fun directionRow(
    key: String,
    periods: List<TimelinePeriod>,
    heights: List<PeriodValue>,
    directions: List<PeriodValue>,
    periodSeconds: List<PeriodValue>?,
    unitLabel: String,
    convention: DirectionConvention,
    convert: (Double?) -> Double?,
): TimelineRow {
    val points = periods.mapIndexed { i, p ->
        TimelineRowPoint(
            isForecast = p.isForecast,
            value = convert(heights[i].value),
            direction = directions[i].value,
            period = periodSeconds?.get(i)?.value,
            modelled = heights[i].modelled,
        )
    }
    return TimelineRow(
        key, unitLabel, TimelineRowKind.Direction, points,
        decimals = 1, directionConvention = convention, available = points.any { it.value != null },
    )
}

private fun lineRow(
    key: String,
    periods: List<TimelinePeriod>,
    values: List<PeriodValue>,
    unitLabel: String,
    decimals: Int,
    signed: Boolean,
    convert: (Double?) -> Double?,
): TimelineRow {
    val points = periods.mapIndexed { i, p ->
        TimelineRowPoint(isForecast = p.isForecast, value = convert(values[i].value), modelled = values[i].modelled)
    }
    return TimelineRow(
        key, unitLabel, TimelineRowKind.Line, points,
        decimals = decimals, signed = signed, available = points.any { it.value != null },
    )
}

fun buildSeaRows(timeline: TimelineData, sea: MergedSea, unit: UnitSystem): SeaRows {
    val periods = timeline.periods
    fun agg(s: List<SeaSample>, m: AggregateMethod) = aggregateIntoPeriods(s, periods, m)
    val height: (Double?) -> Double? = { convertWaveHeight(it, unit) }
    val length = lengthUnitLabel(unit)

    return SeaRows(
        waves = directionRow(
            "waves", periods, agg(sea.waveHeight, AggregateMethod.Max), agg(sea.waveDirection, AggregateMethod.Circular),
            agg(sea.wavePeriod, AggregateMethod.Mean), length, DirectionConvention.From, height,
        ),
        swell = directionRow(
            "swell", periods, agg(sea.swellHeight, AggregateMethod.Max), agg(sea.swellDirection, AggregateMethod.Circular),
            agg(sea.swellPeriod, AggregateMethod.Mean), length, DirectionConvention.From, height,
        ),
        seaTemperature = lineRow(
            "seaTemperature", periods, agg(sea.seaTemperature, AggregateMethod.Mean),
            temperatureUnitLabel(unit), 1, false,
        ) { convertTemperature(it, unit) },
        waterLevel = lineRow(
            "waterLevel", periods, agg(sea.waterLevel, AggregateMethod.Mean),
            levelUnitLabel(unit), 0, true,
        ) { convertWaterLevel(it, unit) },
        current = directionRow(
            "current", periods, agg(sea.currentSpeed, AggregateMethod.Mean), agg(sea.currentDirection, AggregateMethod.Circular),
            null, windUnitLabel(unit), DirectionConvention.Toward,
        ) { convertWindSpeed(it, unit) },
    )
}

data class SeaReading(val value: Double, val observed: Boolean, val time: Long)

data class SeaWind(val speed: Double, val gust: Double?, val direction: Double?)
data class SeaWaves(val height: Double, val period: Double?, val direction: Double?, val observed: Boolean, val time: Long)
data class SeaSwell(val height: Double, val period: Double?, val direction: Double?)
data class SeaCurrent(val speed: Double, val direction: Double?)
data class SeaExtreme(val value: Double, val time: Long)
data class SeaNext24h(
    val maxWave: SeaExtreme?,
    val maxGust: SeaExtreme?,
    val waterLevelMin: Double?,
    val waterLevelMax: Double?,
)

/** Metric values (m/s, m, s, cm, degrees C). */
data class SeaSummary(
    val wind: SeaWind?,
    val waves: SeaWaves?,
    val swell: SeaSwell?,
    val windWaveHeight: Double?,
    val seaTemperature: SeaReading?,
    val waterLevel: SeaReading?,
    val current: SeaCurrent?,
    val next24h: SeaNext24h,
)

/** An SMHI value under 3 h old when there is one, else the model value nearest to now. */
private fun currentReading(samples: List<SeaSample>, now: Long): SeaReading? {
    var fresh: SeaSample? = null
    for (s in samples) {
        if (s.observed && s.time <= now + HALF_HOUR_MS && now - s.time < FRESH_OBS_MS) fresh = s
    }
    var s = fresh
    if (s == null) {
        val models = samples.filter { !it.observed }
        if (models.isNotEmpty()) s = models.nearest(now)
    }
    return s?.let { SeaReading(it.value, it.observed, it.time) }
}

private fun valueNear(samples: List<SeaSample>, now: Long): Double? {
    if (samples.isEmpty()) return null
    val s = samples.nearest(now)
    return if (abs(s.time - now) <= HOUR_MS) s.value else null
}

fun summarizeSea(merged: MergedSea, weather: List<WeatherObservation>, nowMs: Long): SeaSummary {
    val times = weather.map { Instant.parse(it.timestamp).toEpochMilli() }
    val nowIdx = times.indices.minByOrNull { abs(times[it] - nowMs) }
    val nowWeather = nowIdx?.let { weather[it] }

    val wave = currentReading(merged.waveHeight, nowMs)
    val swellH = valueNear(merged.swellHeight, nowMs)
    val currentSpeed = valueNear(merged.currentSpeed, nowMs)

    var maxWave: SeaExtreme? = null
    for (s in merged.waveHeight) {
        if (s.time >= nowMs && s.time <= nowMs + DAY_MS && (maxWave == null || s.value > maxWave.value)) {
            maxWave = SeaExtreme(s.value, s.time)
        }
    }
    var maxGust: SeaExtreme? = null
    weather.forEachIndexed { i, o ->
        val time = times[i]
        val v = o.windGust ?: o.windSpeed
        if (v != null && time >= nowMs && time <= nowMs + DAY_MS && (maxGust == null || v > maxGust!!.value)) {
            maxGust = SeaExtreme(v, time)
        }
    }
    val levels = merged.waterLevel.filter { it.time >= nowMs && it.time <= nowMs + DAY_MS }.map { it.value }

    return SeaSummary(
        wind = nowWeather?.windSpeed?.let { SeaWind(it, nowWeather.windGust, nowWeather.windDirection) },
        waves = wave?.let {
            SeaWaves(
                height = it.value, period = valueNear(merged.wavePeriod, nowMs),
                direction = valueNear(merged.waveDirection, nowMs), observed = it.observed, time = it.time,
            )
        },
        swell = swellH?.let { SeaSwell(it, valueNear(merged.swellPeriod, nowMs), valueNear(merged.swellDirection, nowMs)) },
        windWaveHeight = valueNear(merged.windWaveHeight, nowMs),
        seaTemperature = currentReading(merged.seaTemperature, nowMs),
        waterLevel = currentReading(merged.waterLevel, nowMs),
        current = currentSpeed?.let { SeaCurrent(it, valueNear(merged.currentDirection, nowMs)) },
        next24h = SeaNext24h(
            maxWave = maxWave,
            maxGust = maxGust,
            waterLevelMin = levels.minOrNull(),
            waterLevelMax = levels.maxOrNull(),
        ),
    )
}
