package com.tengmo.vader.ui.navigation

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.foundation.layout.heightIn
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R
import com.tengmo.vader.data.model.Favorite
import com.tengmo.vader.data.model.Location

/** Whether [favorite] is the currently selected place (same coordinates). */
internal fun isSelectedFavorite(favorite: Favorite, selected: Location?): Boolean =
    selected != null && favorite.latitude == selected.latitude && favorite.longitude == selected.longitude

/** Top-bar title: current place + drop-down menu (current location, favorites, search/manage). */
@Composable
fun LocationSwitcher(
    placeName: String?,
    favorites: List<Favorite> = emptyList(),
    selectedPlace: Location? = null,
    onUseCurrentLocation: () -> Unit = {},
    onSelectFavorite: (Favorite) -> Unit = {},
    onSearchOrManage: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    val label = placeName?.takeIf { it.isNotBlank() } ?: stringResource(R.string.locationSwitcher_currentLocation)
    val description = stringResource(R.string.locationSwitcher_a11y, label)
    Box(modifier) {
        Row(
            Modifier
                .heightIn(min = 48.dp)
                .clickable(role = Role.Button) { expanded = true }
                .semantics { contentDescription = description },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(label, maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
            Icon(painterResource(R.drawable.ic_arrow_drop_down), contentDescription = null, modifier = Modifier.size(24.dp))
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(
                text = { Text(stringResource(R.string.locationSwitcher_useCurrentLocation)) },
                leadingIcon = { Icon(painterResource(R.drawable.ic_my_location), contentDescription = null) },
                onClick = { expanded = false; onUseCurrentLocation() },
            )
            favorites.forEach { fav ->
                val isSelected = isSelectedFavorite(fav, selectedPlace)
                DropdownMenuItem(
                    modifier = Modifier.semantics { this.selected = isSelected },
                    text = { Text(fav.displayName, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    trailingIcon = if (isSelected) {
                        { Icon(painterResource(R.drawable.ic_check), contentDescription = null) }
                    } else null,
                    onClick = { expanded = false; onSelectFavorite(fav) },
                )
            }
            HorizontalDivider()
            DropdownMenuItem(
                text = { Text(stringResource(R.string.locationSwitcher_searchPlaces)) },
                onClick = { expanded = false; onSearchOrManage() },
            )
        }
    }
}
