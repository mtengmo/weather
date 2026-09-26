package com.tengmo.vader.ui.settings

import android.app.Application
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.LanguagePreference
import com.tengmo.vader.data.model.Theme
import com.tengmo.vader.data.model.UnitSystem
import kotlinx.coroutines.launch

/** T053 — reads/writes every setting through PreferencesStore (FR-006): theme, units, language,
 *  nearby-station count, high/low visibility. Changes take effect immediately (the Compose UI
 *  observes the same store) and persist across restarts (FR-007). */
class SettingsViewModel(application: Application) : AndroidViewModel(application) {
    private val store = ServiceLocator.get(application).preferencesStore

    val preferences = store.preferences

    fun setTheme(theme: Theme) = viewModelScope.launch { store.setTheme(theme) }

    fun setUnit(unit: UnitSystem) = viewModelScope.launch { store.setUnit(unit) }

    fun setNearbyStationCount(count: Int) = viewModelScope.launch { store.setNearbyStationCount(count) }

    fun setHighLowVisible(visible: Boolean) = viewModelScope.launch { store.setHighLowVisible(visible) }

    /** Persists the choice and applies it app-wide: Auto follows the device locale (an empty
     *  locale list), En/Sv force that language (FR-009, US4 scenario 1). */
    fun setLanguage(language: LanguagePreference) = viewModelScope.launch {
        store.setLanguage(language)
        applyLanguage(language)
    }

    companion object {
        fun applyLanguage(language: LanguagePreference) {
            val locales = when (language) {
                LanguagePreference.Auto -> LocaleListCompat.getEmptyLocaleList()
                LanguagePreference.En -> LocaleListCompat.forLanguageTags("en")
                LanguagePreference.Sv -> LocaleListCompat.forLanguageTags("sv")
            }
            AppCompatDelegate.setApplicationLocales(locales)
        }
    }
}
