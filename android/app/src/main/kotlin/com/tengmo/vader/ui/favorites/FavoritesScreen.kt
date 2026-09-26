package com.tengmo.vader.ui.favorites

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tengmo.vader.R

/** Place search + favorites management screen (US3): search a place, view it or save it (max
 *  10), switch to a saved favorite or back to the current position, and remove favorites.
 *  Selecting anything returns Home, where the Overview shows it (App.tsx `selectLocation`). */
@Composable
fun FavoritesScreen(
    onHome: () -> Unit,
    searchViewModel: PlaceSearchViewModel = viewModel(),
    favoritesViewModel: FavoritesViewModel = viewModel(),
) {
    val search by searchViewModel.uiState.collectAsState()
    val favorites by favoritesViewModel.favorites.collectAsState(initial = emptyList())
    val error by favoritesViewModel.error.collectAsState()

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        TextButton(onClick = onHome) { Text(stringResource(R.string.app_homeButton)) }

        OutlinedButton(onClick = { favoritesViewModel.useCurrentLocation(onHome) }) {
            Text(stringResource(R.string.locationSwitcher_useCurrentLocation))
        }

        PlaceSearchView(
            state = search,
            onQueryChange = searchViewModel::setQuery,
            onSearch = searchViewModel::search,
            onView = { favoritesViewModel.selectCandidate(it, onHome) },
            onAddFavorite = favoritesViewModel::add,
        )

        FavoritesList(
            favorites = favorites,
            error = error,
            onSelect = { favoritesViewModel.select(it.toLocation(), onHome) },
            onRemove = favoritesViewModel::remove,
            onDismissError = favoritesViewModel::clearError,
        )
    }
}
