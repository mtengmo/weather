package com.tengmo.vader.ui.favorites

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tengmo.vader.R
import com.tengmo.vader.data.model.FAVORITES_LIMIT
import com.tengmo.vader.data.model.Favorite

/** T051 — favorites list: select, remove, empty state, and the duplicate / 10-item-limit errors
 *  (FavoritesList.tsx). */
@Composable
fun FavoritesList(
    favorites: List<Favorite>,
    error: FavoritesError?,
    onSelect: (Favorite) -> Unit,
    onRemove: (Favorite) -> Unit,
    onDismissError: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(stringResource(R.string.favoritesList_title), fontSize = 18.sp)

        error?.let {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    when (it) {
                        FavoritesError.Duplicate -> stringResource(R.string.favoritesError_duplicate)
                        FavoritesError.LimitReached -> stringResource(R.string.favoritesError_limitReached, FAVORITES_LIMIT.toString())
                    },
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.weight(1f),
                )
                TextButton(onClick = onDismissError) { Text(stringResource(R.string.favoritesList_dismiss)) }
            }
        }

        if (favorites.isEmpty()) {
            Text(stringResource(R.string.favoritesList_empty))
        } else {
            favorites.forEach { fav ->
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = { onSelect(fav) }, modifier = Modifier.weight(1f)) {
                        Text(fav.displayName, modifier = Modifier.fillMaxWidth())
                    }
                    TextButton(onClick = { onRemove(fav) }) { Text(stringResource(R.string.favoritesList_remove)) }
                }
            }
        }
    }
}
