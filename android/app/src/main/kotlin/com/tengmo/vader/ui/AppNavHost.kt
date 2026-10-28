package com.tengmo.vader.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.LocalViewModelStoreOwner
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.HomeView
import com.tengmo.vader.ui.favorites.FavoritesScreen
import com.tengmo.vader.ui.graph.GraphScreen
import com.tengmo.vader.ui.map.MapScreen
import com.tengmo.vader.ui.navigation.AppScaffold
import com.tengmo.vader.ui.navigation.homeRouteOf
import com.tengmo.vader.ui.navigation.startRouteFor
import com.tengmo.vader.location.rememberLocationPermissionState
import com.tengmo.vader.ui.overview.LocalLocationPermission
import com.tengmo.vader.ui.overview.OverviewBootstrap
import com.tengmo.vader.ui.overview.OverviewScreen
import com.tengmo.vader.ui.overview.OverviewViewModel
import com.tengmo.vader.ui.sea.SeaScreen
import com.tengmo.vader.ui.settings.SettingsScreen

// Top-level navigation: Overview is the start destination; tabs use popUpTo(start) so back from a
// tab returns to the start tab and back from it exits the app. The start tab is the stored home
// view (the last explicitly chosen of Overview / Sea, saved by the bottom bar), fixed at launch.
object Routes {
    const val OVERVIEW = "overview"
    const val GRAPH = "graph"
    const val MAP = "map"
    const val FAVORITES = "favorites"
    const val SEA = "sea"
    const val SETTINGS = "settings"
}

@Composable
fun AppNavHost(
    placeName: String? = null,
    goToOverviewSignal: Int = 0,
    navController: NavHostController = rememberNavController(),
) {
    val context = LocalContext.current
    val preferencesStore = ServiceLocator.get(context).preferencesStore
    // One OverviewViewModel for Overview and Sea (activity scope): the sea page reuses its
    // location, observations and timeline, and OverviewBootstrap below starts it on any tab.
    // Read here, outside the NavHost, where the owner is the activity.
    val activityOwner = checkNotNull(LocalViewModelStoreOwner.current) { "No ViewModelStoreOwner" }
    val overviewViewModel: OverviewViewModel = viewModel(viewModelStoreOwner = activityOwner)
    // One permission state for the bootstrap and every LocationGate.
    val permission = rememberLocationPermissionState()

    val prefs by preferencesStore.preferences.collectAsState(initial = null)
    val homeRoute = homeRouteOf(prefs?.homeView ?: HomeView.Overview)

    // The start tab is decided once, when the stored preferences first arrive, and then held (also
    // across rotation) so the back stack is rooted at it and Back from it leaves the app. Nothing here
    // saves the home view: only explicit choices do (bottom bar, AppScaffold).
    var startRoute by rememberSaveable { mutableStateOf<String?>(null) }
    LaunchedEffect(prefs != null) {
        val loaded = prefs ?: return@LaunchedEffect
        if (startRoute == null) startRoute = startRouteFor(loaded.homeView, openedFromWidget = goToOverviewSignal > 0)
    }

    fun navigateTab(target: String) {
        navController.navigate(target) {
            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    // A picked location (map pin, favorites) lands on the home-view tab.
    fun navigateHome() = navigateTab(homeRoute)

    val start = startRoute
    if (start == null) {
        LaunchScreen()
        return
    }

    CompositionLocalProvider(LocalLocationPermission provides permission) {
        OverviewBootstrap(overviewViewModel, permission)

        AppScaffold(navController, placeName, goToOverviewSignal) {
            NavHost(navController = navController, startDestination = start) {
                composable(Routes.OVERVIEW) {
                    OverviewScreen(
                        onOpenFavorites = { navigateTab(Routes.FAVORITES) },
                        viewModel = overviewViewModel,
                    )
                }
                composable(Routes.GRAPH) { GraphScreen() }
                composable(Routes.MAP) { MapScreen(onHome = ::navigateHome) }
                composable(Routes.FAVORITES) { FavoritesScreen(onHome = ::navigateHome) }
                composable(Routes.SEA) {
                    SeaScreen(
                        onOpenFavorites = { navigateTab(Routes.FAVORITES) },
                        overviewViewModel = overviewViewModel,
                    )
                }
                composable(Routes.SETTINGS) { SettingsScreen() }
            }
        }
    }
}
