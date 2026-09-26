package com.tengmo.vader.ui.favorites

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R
import com.tengmo.vader.data.source.OpenMeteoSource

/** T049 — place-search UI: query field, results list with View / Add-to-favorites actions, and
 *  the empty/error states (PlaceSearch.tsx). */
@Composable
fun PlaceSearchView(
    state: PlaceSearchUiState,
    onQueryChange: (String) -> Unit,
    onSearch: () -> Unit,
    onView: (OpenMeteoSource.PlaceCandidate) -> Unit,
    onAddFavorite: (OpenMeteoSource.PlaceCandidate) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
            value = state.query,
            onValueChange = onQueryChange,
            label = { Text(stringResource(R.string.placeSearch_label)) },
            placeholder = { Text(stringResource(R.string.placeSearch_placeholder)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { onSearch() }),
            modifier = Modifier.fillMaxWidth(),
        )
        Button(onClick = onSearch, enabled = state.query.isNotBlank() && !state.isSearching) {
            Text(stringResource(R.string.placeSearch_label))
        }

        if (state.error) Text(stringResource(R.string.placeSearch_searchError), color = MaterialTheme.colorScheme.error)
        if (state.hasSearched && !state.error && state.results.isEmpty()) Text(stringResource(R.string.placeSearch_noResults))

        state.results.forEach { place ->
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(place.displayName, Modifier.weight(1f))
                TextButton(onClick = { onView(place) }) { Text(stringResource(R.string.placeSearch_view)) }
                TextButton(onClick = { onAddFavorite(place) }) { Text(stringResource(R.string.placeSearch_addToFavorites)) }
            }
        }
    }
}
