package com.tengmo.vader.ui

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.tengmo.vader.ui.favorites.FavoritesScreen
import com.tengmo.vader.ui.graph.GraphScreen
import com.tengmo.vader.ui.map.MapScreen
import com.tengmo.vader.ui.navigation.AppScaffold
import com.tengmo.vader.ui.overview.OverviewScreen
import com.tengmo.vader.ui.settings.SettingsScreen

// Top-level navigation: Overview is the start destination; tabs use popUpTo(start) so back from a
// tab returns to Overview and back from Overview exits the app.
object Routes {
    const val OVERVIEW = "overview"
    const val GRAPH = "graph"
    const val MAP = "map"
    const val FAVORITES = "favorites"
    const val SETTINGS = "settings"
}

@Composable
fun AppNavHost(
    placeName: String? = null,
    goToOverviewSignal: Int = 0,
    navController: NavHostController = rememberNavController(),
) {
    fun navigateHome() {
        navController.popBackStack(Routes.OVERVIEW, inclusive = false)
    }

    AppScaffold(navController, placeName, goToOverviewSignal) {
        NavHost(navController = navController, startDestination = Routes.OVERVIEW) {
            composable(Routes.OVERVIEW) {
                OverviewScreen(
                    onOpenFavorites = { navController.navigate(Routes.FAVORITES) },
                )
            }
            composable(Routes.GRAPH) { GraphScreen() }
            composable(Routes.MAP) { MapScreen(onHome = ::navigateHome) }
            composable(Routes.FAVORITES) { FavoritesScreen(onHome = ::navigateHome) }
            composable(Routes.SETTINGS) { SettingsScreen() }
        }
    }
}
