package com.tengmo.vader.ui.overview.timeline

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.layout
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R

/** Column geometry shared by every row so the tint, the Now line and the captions line up. */
@Immutable
internal class TimelineGeometry(
    val columnWidth: Dp,
    val columns: Int,
    /** Index of the first forecast column, -1 when everything is observed. */
    val firstForecast: Int,
    /** 0..1 fraction of the full width, null = no marker. */
    val nowPosition: Double?,
) {
    val totalWidth: Dp = columnWidth * columns
    val nowX: Dp? = nowPosition?.takeIf { it in 0.0..1.0 }?.let { totalWidth * it.toFloat() }
    val forecastStartX: Dp? = firstForecast.takeIf { it >= 0 }?.let { columnWidth * it }
}

private val MarkerWidth = 2.dp
private val ChipGap = 32.dp
private val MinCaptionRoom = 48.dp

/** Tints the forecast columns and draws the vertical Now line; apply to every row's content. */
@Composable
internal fun Modifier.timelineBackdrop(g: TimelineGeometry): Modifier {
    val tint: Color = MaterialTheme.colorScheme.surfaceContainerHigh
    val marker: Color = MaterialTheme.colorScheme.primary
    return drawBehind {
        g.forecastStartX?.let { x ->
            drawRect(tint, Offset(x.toPx(), 0f), Size(size.width - x.toPx(), size.height))
        }
        g.nowX?.let { x ->
            val w = MarkerWidth.toPx()
            drawRect(marker, Offset(x.toPx() - w / 2, 0f), Size(w, size.height))
        }
    }
}

/** Top row of the timeline: "Observed" / "Forecast" captions flanking the "Now" chip. */
@Composable
internal fun TimelineCaptionRow(g: TimelineGeometry, modifier: Modifier = Modifier) {
    val observedEnd: Dp = g.nowX?.minus(ChipGap) ?: g.forecastStartX ?: g.totalWidth
    val forecastStart: Dp? = g.nowX?.plus(ChipGap) ?: g.forecastStartX
    Box(modifier.width(g.totalWidth).timelineBackdrop(g).padding(vertical = 4.dp)) {
        if (g.firstForecast != 0 && observedEnd >= MinCaptionRoom) {
            Caption(
                stringResource(R.string.weatherOverview_observed),
                Modifier.width(observedEnd).padding(end = 4.dp),
                Alignment.CenterEnd,
            )
        }
        if (forecastStart != null) {
            Caption(
                stringResource(R.string.weatherOverview_forecast),
                Modifier.offset(x = forecastStart).padding(start = 4.dp),
                Alignment.CenterStart,
            )
        }
        g.nowX?.let { x -> NowChip(x) }
    }
}

@Composable
private fun Caption(text: String, modifier: Modifier, align: Alignment) {
    Box(modifier, contentAlignment = align) {
        Text(
            text,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/** "Now" chip centred on [x] (kept inside the row by the parent's width). */
@Composable
private fun NowChip(x: Dp) {
    Surface(
        color = MaterialTheme.colorScheme.primaryContainer,
        contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
        shape = MaterialTheme.shapes.small,
        modifier = Modifier.layout { measurable, constraints ->
            val p = measurable.measure(constraints.copy(minWidth = 0))
            layout(constraints.maxWidth, p.height) {
                p.place((x.roundToPx() - p.width / 2).coerceAtLeast(0), 0)
            }
        },
    ) {
        Text(
            stringResource(R.string.weatherOverview_now),
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            maxLines = 1,
        )
    }
}
