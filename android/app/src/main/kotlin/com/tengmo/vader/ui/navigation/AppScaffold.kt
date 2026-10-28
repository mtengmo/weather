package com.tengmo.vader.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.tengmo.vader.R
import com.tengmo.vader.data.model.HomeView
import com.tengmo.vader.ui.Routes

/** The tab that opens for a stored home view (a picked location lands there). */
fun homeRouteOf(homeView: HomeView): String = if (homeView == HomeView.Sea) Routes.SEA else Routes.OVERVIEW

/** The route the app opens on: the stored home view, except that a widget tap always opens Overview. */
fun startRouteFor(homeView: HomeView, openedFromWidget: Boolean): String =
    if (openedFromWidget) Routes.OVERVIEW else homeRouteOf(homeView)

/** The home view to store after the user picks a bottom-bar tab; null for tabs that are not a home view. */
fun homeViewChosenByTab(route: String): HomeView? = when (route) {
    Routes.OVERVIEW -> HomeView.Overview
    Routes.SEA -> HomeView.Sea
    else -> null
}

/** Single app-wide Scaffold: top bar (location switcher + settings gear / back arrow) and the
 *  5-tab bottom bar. [content] is placed inside the Scaffold's inner padding. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppScaffold(
    navController: NavHostController,
    placeName: String?,
    goToOverviewSignal: Int,
    content: @Composable () -> Unit,
) {
    val chrome: AppChromeViewModel = viewModel()
    val favorites by chrome.favorites.collectAsState(initial = emptyList())
    val selectedPlace by chrome.selectedPlace.collectAsState(initial = null)
    val backStackEntry by navController.currentBackStackEntryAsState()
    val route = backStackEntry?.destination?.route
    val onSettings = route == Routes.SETTINGS
    val homeView by chrome.homeView.collectAsState(initial = HomeView.Overview)
    val homeRoute = homeRouteOf(homeView)

    fun navigateTab(target: String) {
        navController.navigate(target) {
            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    // One-shot: a widget tap switches to Overview (signal is bumped by MainActivity).
    LaunchedEffect(goToOverviewSignal) {
        if (goToOverviewSignal > 0) navigateTab(Routes.OVERVIEW)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    LocationSwitcher(
                        placeName = placeName,
                        favorites = favorites,
                        selectedPlace = selectedPlace,
                        onUseCurrentLocation = { chrome.useCurrentLocation { navigateTab(homeRoute) } },
                        onSelectFavorite = { fav -> chrome.select(fav.toLocation()) { navigateTab(homeRoute) } },
                        onSearchOrManage = { navigateTab(Routes.FAVORITES) },
                    )
                },
                navigationIcon = {
                    if (onSettings) {
                        IconButton(onClick = { navController.popBackStack() }) {
                            Icon(painterResource(R.drawable.ic_arrow_back), stringResource(R.string.nav_back))
                        }
                    }
                },
                actions = {
                    if (!onSettings) {
                        IconButton(onClick = { navController.navigate(Routes.SETTINGS) { launchSingleTop = true } }) {
                            Icon(painterResource(R.drawable.ic_settings), stringResource(R.string.nav_settings))
                        }
                    }
                },
            )
        },
        bottomBar = {
            if (!onSettings) {
                NavigationBar {
                    TopLevelDestination.entries.forEach { dest ->
                        val selected = route == dest.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                homeViewChosenByTab(dest.route)?.let(chrome::setHomeView)
                                navigateTab(dest.route)
                            },
                            icon = { Icon(painterResource(dest.iconRes), contentDescription = null) },
                            label = { Text(stringResource(dest.labelRes)) },
                        )
                    }
                }
            }
        },
    ) { inner ->
        Box(Modifier.padding(inner).consumeWindowInsets(inner)) { content() }
    }
}
