package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.LanguagePreference
import java.util.Locale

/** T027 — resolves the effective app locale from a [LanguagePreference], mirroring web's
 *  "auto" behavior (src/services/language.ts): follow the device/browser language when set to
 *  Auto, or force English/Swedish otherwise (FR-009). */
fun resolveEffectiveLocale(preference: LanguagePreference, deviceLocale: Locale = Locale.getDefault()): Locale =
    when (preference) {
        LanguagePreference.En -> Locale("en")
        LanguagePreference.Sv -> Locale("sv")
        LanguagePreference.Auto -> if (deviceLocale.language == "sv") Locale("sv") else Locale("en")
    }
