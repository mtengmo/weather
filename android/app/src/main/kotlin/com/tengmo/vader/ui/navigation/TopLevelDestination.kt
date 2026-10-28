package com.tengmo.vader.ui.navigation

import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import com.tengmo.vader.R
import com.tengmo.vader.ui.Routes

/** The five bottom-bar tabs. Details/Settings are not tabs (Details moves into Graph in N3). */
enum class TopLevelDestination(
    val route: String,
    @StringRes val labelRes: Int,
    @DrawableRes val iconRes: Int,
) {
    Overview(Routes.OVERVIEW, R.string.nav_overview, R.drawable.ic_nav_overview),
    Graph(Routes.GRAPH, R.string.nav_graph, R.drawable.ic_nav_graph),
    Map(Routes.MAP, R.string.nav_map, R.drawable.ic_nav_map),
    Favorites(Routes.FAVORITES, R.string.nav_favorites, R.drawable.ic_nav_favorites),
    Sea(Routes.SEA, R.string.seaWeather_title, R.drawable.ic_nav_sea),
}
