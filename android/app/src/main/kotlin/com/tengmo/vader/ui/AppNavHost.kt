package com.tengmo.vader.ui

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.compose.runtime.getValue
import com.tengmo.vader.ui.details.DetailsScreen
import com.tengmo.vader.ui.favorites.FavoritesScreen
import com.tengmo.vader.ui.graph.GraphScreen
import com.tengmo.vader.ui.map.MapScreen
import com.tengmo.vader.ui.overview.OverviewScreen
import com.tengmo.vader.ui.settings.SettingsScreen

// T028/T047/T056 — top-level navigation: Overview is always the app's home (FR-014). Every
// non-Overview route calls `navigateHome` on both its own Home button and the system back
// gesture/button, so "Home always means Overview" holds everywhere (US2 scenario 2,
// 032-dashboard-polish-round-seven precedent carried over from the web app).
object Routes {
    const val OVERVIEW = "overview"
    const val GRAPH = "graph"
    const val DETAILS = "details"
    const val MAP = "map"
    const val FAVORITES = "favorites"
    const val SETTINGS = "settings"
}

@Composable
fun AppNavHost(navController: NavHostController = rememberNavController()) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    fun navigateHome() {
        navController.popBackStack(Routes.OVERVIEW, inclusive = false)
    }

    // FR-014 / US2 scenario 4-5: back from any non-Overview screen returns Home; back from the
    // Overview itself falls through to the platform's normal behavior (leaves the app).
    if (currentRoute != null && currentRoute != Routes.OVERVIEW) {
        BackHandler(enabled = true) { navigateHome() }
    }

    NavHost(navController = navController, startDestination = Routes.OVERVIEW) {
        composable(Routes.OVERVIEW) {
            OverviewScreen(
                onOpenGraph = { navController.navigate(Routes.GRAPH) },
                onOpenDetails = { navController.navigate(Routes.DETAILS) },
                onOpenMap = { navController.navigate(Routes.MAP) },
                onOpenFavorites = { navController.navigate(Routes.FAVORITES) },
                onOpenSettings = { navController.navigate(Routes.SETTINGS) },
            )
        }
        composable(Routes.GRAPH) { GraphScreen(onHome = ::navigateHome) }
        composable(Routes.DETAILS) { DetailsScreen(onHome = ::navigateHome) }
        composable(Routes.MAP) { MapScreen(onHome = ::navigateHome) }
        composable(Routes.FAVORITES) { FavoritesScreen(onHome = ::navigateHome) }
        composable(Routes.SETTINGS) { SettingsScreen(onHome = ::navigateHome) }
    }
}
