package com.tengmo.vader.ui.sea

import com.tengmo.vader.data.model.UnitSystem
import com.tengmo.vader.data.repository.convertWaterLevel
import com.tengmo.vader.data.repository.convertWaveHeight
import com.tengmo.vader.data.repository.formatValue
import com.tengmo.vader.data.repository.lengthUnitLabel
import com.tengmo.vader.data.repository.levelUnitLabel

// Pure text formatting for the sea summary card (ports of the local helpers in SeaSummaryCard.tsx).

/** "1.2 m" / "3.9 ft" from metres. */
internal fun seaHeightText(meters: Double, unit: UnitSystem): String =
    "${formatValue(convertWaveHeight(meters, unit), 1)} ${lengthUnitLabel(unit)}"

/** Water level number with an explicit "+" for positive values, from cm (no unit). */
internal fun seaLevelText(cm: Double, unit: UnitSystem): String {
    val v = convertWaterLevel(cm, unit) ?: return "—"
    return "${if (v > 0) "+" else ""}${formatValue(v, 0)}"
}

internal fun seaLevelWithUnit(cm: Double, unit: UnitSystem): String = "${seaLevelText(cm, unit)} ${levelUnitLabel(unit)}"

/** "-4 … +12 cm". */
internal fun seaLevelRangeText(minCm: Double, maxCm: Double, unit: UnitSystem): String =
    "${seaLevelText(minCm, unit)} … ${seaLevelText(maxCm, unit)} ${levelUnitLabel(unit)}"

/** "2.4 s" style period suffix used after a height: " · 5 s". */
internal fun seaPeriodSuffix(period: Double?): String = period?.let { " · ${formatValue(it, 0)} s" }.orEmpty()
