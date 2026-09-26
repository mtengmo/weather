// T001/T002: Android app module — native Kotlin + Compose app (FR-001a), Glance widgets,
// WorkManager background refresh, DataStore persistence, Ktor networking (research.md §1-6).
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "com.tengmo.vader"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.tengmo.vader"
        // minSdk per research.md §11 — "latest 4-5 major versions still receiving security
        // updates" at plan time; Android 8.0 (API 26) covers that window with wide reach.
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Optional free OpenWeatherMap key for the map's Temperature/Wind overlays — the web
        // app reads the same optional key (VITE_OPENWEATHERMAP_API_KEY) and hides those two
        // overlays entirely when it's absent (MapView.tsx). Provide via `-POPENWEATHERMAP_API_KEY=...`
        // or the OPENWEATHERMAP_API_KEY environment variable; empty by default.
        val owmKey = (project.findProperty("OPENWEATHERMAP_API_KEY") as String?)
            ?: System.getenv("OPENWEATHERMAP_API_KEY")
            ?: ""
        buildConfigField("String", "OPENWEATHERMAP_API_KEY", "\"$owmKey\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // T077: Play Console's own crash/ANR reporting needs no SDK — it is automatic for
            // apps distributed through Play, so no crashlytics/analytics dependency is added
            // here, matching FR-018's no-tracking-identifiers rule (research.md §10).
        }
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
    }

    androidResources {
        generateLocaleConfig = true
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Compose (research.md §1)
    val composeBom = platform("androidx.compose:compose-bom:2024.09.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")
    implementation("androidx.navigation:navigation-compose:2.8.0")
    debugImplementation("androidx.compose.ui:ui-tooling")

    // Glance widgets (research.md §2)
    implementation("androidx.glance:glance-appwidget:1.1.1")
    implementation("androidx.glance:glance-material3:1.1.1")

    // WorkManager background refresh (research.md §4)
    implementation("androidx.work:work-runtime-ktx:2.9.1")

    // Location (research.md §3)
    implementation("com.google.android.gms:play-services-location:21.3.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.8.1")

    // DataStore persistence (research.md §6)
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    // Networking (research.md §5) — Ktor client for coroutine-native calls to
    // SMHI/Open-Meteo/MET Norway/Nominatim (contracts/weather-data-sources.md)
    implementation("io.ktor:ktor-client-core:2.3.12")
    implementation("io.ktor:ktor-client-android:2.3.12")
    implementation("io.ktor:ktor-client-content-negotiation:2.3.12")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.12")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.1")

    // Map (research.md §8) — osmdroid: OSM tiles with custom tile overlays for radar/temperature/
    // wind, no API key or Google Play Services Maps dependency.
    implementation("org.osmdroid:osmdroid-android:6.1.20")

    // Core
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")

    // Testing (T075, T076)
    testImplementation("junit:junit:4.13.2")
    testImplementation("io.ktor:ktor-client-mock:2.3.12")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
}
