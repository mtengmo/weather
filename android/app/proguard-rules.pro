# Add project specific ProGuard rules here.
# Kotlinx.serialization needs its generated (de)serializer classes kept.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class com.tengmo.vader.data.model.** {
    kotlinx.serialization.KSerializer serializer(...);
}
