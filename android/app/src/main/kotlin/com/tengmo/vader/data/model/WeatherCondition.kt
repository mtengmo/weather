package com.tengmo.vader.data.model

// T008 support — mirrors web's src/services/weatherCondition.ts classification enum, used by
// WeatherObservation.symbolCondition and by icon/companion-character selection (research.md §1,
// FR-011).
enum class WeatherCondition {
    ClearDay,
    ClearNight,
    PartlyCloudy,
    Cloudy,
    LightRain,
    HeavyRain,
    Windy,
    LightSnow,
    HeavySnow,
    Thunderstorm,
    Foggy,
    Sleet,
}
