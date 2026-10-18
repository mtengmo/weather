package com.tengmo.vader.work.sync

import com.tengmo.vader.data.model.ObservationWindow
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException
import java.time.Duration
import java.time.Instant

class SyncPlannerTest {
    private val now = Instant.parse("2026-01-01T12:00:00Z")
    private val sel = SyncPlace(59.3293, 18.0686, "Sthlm")
    private val fav = SyncPlace(57.7089, 11.9746, "Gbg")

    private fun inputs(
        selected: SyncPlace? = sel,
        favorites: List<SyncPlace> = emptyList(),
        widgets: List<SyncPlace> = emptyList(),
        age: Map<String, Duration?> = emptyMap(),
        unmetered: Boolean = true,
        hasWidgets: Boolean = widgets.isNotEmpty(),
        mode: SyncMode = SyncMode.FULL,
    ) = SyncPlanInputs(selected, favorites, widgets, age, now, unmetered, hasWidgets, mode)

    @Test fun selectedBoundary55() {
        assertTrue(SyncPlanner.plan(inputs(age = mapOf(sel.key to Duration.ofMinutes(54)))).isEmpty())
        val j = SyncPlanner.plan(inputs(age = mapOf(sel.key to Duration.ofMinutes(55)))).single()
        assertEquals(setOf(SyncRole.SELECTED), j.roles)
        assertEquals(ObservationWindow.Last7Days, j.window)
        assertEquals(1, SyncPlanner.plan(inputs()).size)
    }

    @Test fun favoriteBoundary3h() {
        val fresh = mapOf(sel.key to Duration.ZERO, fav.key to Duration.ofHours(3).minusMinutes(1))
        assertTrue(SyncPlanner.plan(inputs(favorites = listOf(fav), age = fresh)).isEmpty())
        val old = mapOf(sel.key to Duration.ZERO, fav.key to Duration.ofHours(3))
        assertEquals(SyncRole.FAVORITE, SyncPlanner.plan(inputs(favorites = listOf(fav), age = old)).single().roles.single())
    }

    @Test fun favoritesSkippedWhenMetered() {
        val jobs = SyncPlanner.plan(inputs(favorites = listOf(fav), unmetered = false))
        assertEquals(listOf(sel.key), jobs.map { it.key })
    }

    @Test fun dedupMergesRolesAndPrefersLargerWindow() {
        val dup = SyncPlace(59.32934, 18.06861)
        val j = SyncPlanner.plan(inputs(widgets = listOf(dup))).single()
        assertEquals(setOf(SyncRole.SELECTED, SyncRole.WIDGET), j.roles)
        assertEquals(ObservationWindow.Last7Days, j.window)
    }

    @Test fun widgetOnlyUses24h() {
        val j = SyncPlanner.plan(inputs(selected = null, widgets = listOf(fav))).single()
        assertEquals(ObservationWindow.Last24Hours, j.window)
    }

    @Test fun noTargetsEmpty() {
        assertTrue(SyncPlanner.plan(inputs(selected = null)).isEmpty())
    }

    @Test fun widgetsModeOnlyWidgets() {
        val jobs = SyncPlanner.plan(inputs(favorites = listOf(fav), widgets = listOf(fav), mode = SyncMode.WIDGETS))
        assertEquals(setOf(SyncRole.WIDGET), jobs.single().roles)
    }

    @Test fun capAt11() {
        val favs = (1..10).map { SyncPlace(50.0 + it, 10.0) }
        val ws = (1..5).map { SyncPlace(60.0 + it, 12.0) }
        assertEquals(11, SyncPlanner.plan(inputs(favorites = favs, widgets = ws)).size)
    }

    @Test fun period() {
        assertEquals(30L, SyncPlanner.periodMinutes(true))
        assertEquals(60L, SyncPlanner.periodMinutes(false))
    }

    private fun outcome(roles: Set<SyncRole>, err: Throwable?) =
        SyncOutcome(SyncJob("k", 0.0, 0.0, null, roles, ObservationWindow.Last7Days), null, null, err)

    @Test fun retryDecisions() {
        val sIo = outcome(setOf(SyncRole.SELECTED), IOException())
        assertEquals(RetryDecision.RETRY, SyncPlanner.retryDecision(listOf(sIo), 0))
        assertEquals(RetryDecision.RETRY, SyncPlanner.retryDecision(listOf(sIo), 2))
        assertEquals(RetryDecision.SUCCESS, SyncPlanner.retryDecision(listOf(sIo), 3))
        assertEquals(RetryDecision.SUCCESS, SyncPlanner.retryDecision(listOf(outcome(setOf(SyncRole.SELECTED), IllegalStateException())), 0))
        assertEquals(RetryDecision.SUCCESS, SyncPlanner.retryDecision(listOf(outcome(setOf(SyncRole.FAVORITE), IOException())), 0))
        assertEquals(RetryDecision.SUCCESS, SyncPlanner.retryDecision(emptyList(), 0))
    }
}
