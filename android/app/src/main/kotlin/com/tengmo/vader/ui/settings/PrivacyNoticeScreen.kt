package com.tengmo.vader.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tengmo.vader.R

/** T071 — privacy notice (FR-018/FR-019): what is stored on-device, where location goes, and that
 *  there is no advertising/analytics/tracking. The web app's notice mentions Google Analytics; the
 *  Android app deliberately has none (FR-018), so it has its own wording. The same text backs the
 *  store's privacy-policy declaration. */
@Composable
fun PrivacyNoticeView() {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(stringResource(R.string.privacy_storage), fontSize = 13.sp)
        Text(stringResource(R.string.privacy_location), fontSize = 13.sp)
        Text(stringResource(R.string.privacy_noTracking), fontSize = 13.sp)
    }
}
