package com.tengmo.vader.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

/** Looks up a string resource by its generated name (e.g. "smhiCode_7", "moonPhase_full") —
 *  needed because several web i18n keys are dynamic (`t(\`moonPhase.${phase}\`)`,
 *  `t(\`smhiCode.${code}\`)`), which resource IDs (compile-time constants) can't express.
 *  Returns [fallback] when no such resource exists. */
@Composable
fun stringByName(name: String, fallback: String = "", vararg formatArgs: Any): String {
    val context = LocalContext.current
    val id = context.resources.getIdentifier(name, "string", context.packageName)
    return if (id == 0) fallback else context.getString(id, *formatArgs)
}
