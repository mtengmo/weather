import { useEffect, useState } from "react";
import { DEFAULT_METRIC, type Location, type ObservationWindow, type WeatherMetric } from "./models/types";
import { useGeolocation } from "./hooks/useGeolocation";
import { useFavorites } from "./hooks/useFavorites";
import { useUnitPreference } from "./hooks/useUnitPreference";
import { useThemePreference } from "./hooks/useThemePreference";
import { useNearbyStationCountPreference } from "./hooks/useNearbyStationCountPreference";
import { useHighLowVisibilityPreference } from "./hooks/useHighLowVisibilityPreference";
import { useObservationData } from "./hooks/useObservationData";
import ObservationChart from "./components/ObservationChart";
import ObservationDetails from "./components/ObservationDetails";
import WeatherIconOverview from "./components/WeatherIconOverview";
import NearbyStationCountControl from "./components/NearbyStationCountControl";
import DisplayMenu from "./components/DisplayMenu";
import LocationPanel from "./components/LocationPanel";
import Footer from "./components/Footer";
import MapView from "./components/MapView";
import { getCachedLocation, setCachedLocation } from "./services/locationCache";
import { deriveWeatherCondition } from "./services/weatherCondition";
import { WEATHER_ICONS } from "./components/weatherIcons";
import { deriveFeelsLike } from "./services/feelsLike";
import { convertTemperature } from "./services/units";
import { formatValue } from "./services/format";

type View = "graph" | "details" | "overview" | "map";

export default function App() {
  const { location: currentLocation, status: geoStatus, request: requestLocation } =
    useGeolocation();
  const { favorites, error: favoritesError, add, remove, clearError } = useFavorites();
  const { unit, setUnit } = useUnitPreference();
  const { theme, setTheme } = useThemePreference();
  const { count: nearbyStationCount, setCount: setNearbyStationCount } =
    useNearbyStationCountPreference();
  const { visible: highLowVisible, setVisible: setHighLowVisible } =
    useHighLowVisibilityPreference();

  const [selected, setSelected] = useState<Location | null>(null);
  const [obsWindow, setObsWindow] = useState<ObservationWindow>("last-24-hours");
  const [metric, setMetric] = useState<WeatherMetric>(DEFAULT_METRIC);
  // Overview is the primary, most digestible view of current conditions — the app opens on it
  // whenever a location resolves, rather than the classic line-graph (013, FR-001).
  const [view, setView] = useState<View>("overview");
  // The view active immediately before opening the map, so "Back" can return to it
  // (019-dashboard-polish-round-four, US2) — the map previously had no way to leave.
  const [previousView, setPreviousView] = useState<View>("overview");

  const { series, nearbyStations, multiSourceForecast, weeklySeries, lastUpdated } = useObservationData(
    selected,
    obsWindow,
    nearbyStationCount
  );

  // Last non-forecast observation in the current series — the header's inline "current
  // conditions" reading (018-dashboard-visual-redesign, contracts/header-redesign.md).
  const observedPoints = series?.observations.filter((o) => !o.isForecast) ?? [];
  const currentConditions = observedPoints.length > 0 ? observedPoints[observedPoints.length - 1] : null;
  const currentFeelsLike =
    currentConditions !== null
      ? deriveFeelsLike({
          temperature: currentConditions.temperature,
          windSpeed: currentConditions.windSpeed,
          relativeHumidity: currentConditions.relativeHumidity ?? null,
        })
      : null;
  const currentCondition =
    currentConditions !== null
      ? deriveWeatherCondition({
          temperature: currentConditions.temperature,
          precipitation: currentConditions.precipitation,
          windSpeed: currentConditions.windSpeed,
          cloudCoverPercent: currentConditions.cloudCoverPercent,
          timestamp: currentConditions.timestamp,
        })
      : null;
  const currentConditionLabel = currentCondition !== null ? WEATHER_ICONS[currentCondition].label : null;

  useEffect(() => {
    requestLocation();
    // Request current location once on initial load (FR-003, SC-001).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Restore the last-viewed location on load (009 FR-014-016) — only while nothing has been
    // selected yet, so this never fights the currentLocation-sync effect below. A cached
    // favorite is only trusted once it's confirmed to still exist in the loaded favorites list;
    // a cached current-position result needs no such check.
    if (selected !== null) return;
    const cached = getCachedLocation();
    if (!cached) return;
    if (cached.source === "favorite") {
      const stillFavorite = favorites.some(
        (f) => f.latitude === cached.latitude && f.longitude === cached.longitude
      );
      if (!stillFavorite) return;
    }
    setSelected(cached);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

  useEffect(() => {
    if (!currentLocation) return;
    setSelected((prev) => {
      if (prev === null) return currentLocation;
      // Keep displayName in sync as useGeolocation's async name resolution improves it
      // (005's station lookup, then 006's geocoding fallback) — otherwise this copy goes
      // stale the moment it's first taken, and the improved name never reaches the UI.
      const isSameCurrentPosition =
        prev.source === "current-position" &&
        prev.latitude === currentLocation.latitude &&
        prev.longitude === currentLocation.longitude;
      return isSameCurrentPosition && prev.displayName !== currentLocation.displayName
        ? currentLocation
        : prev;
    });
  }, [currentLocation]);

  function selectLocation(location: Location) {
    setSelected(location);
    setCachedLocation(location);
    // Land on the Overview, consistent with the same default this app opens on (013, research.md §1).
    setView("overview");
  }

  function viewOverview() {
    // The overview only supports 24h/7d (007-weather-icon-overview) — fall back to 24h if
    // the shared window is currently 30-day, rather than showing an invalid option there.
    if (obsWindow === "last-30-days") {
      setObsWindow("last-24-hours");
    }
    setView("overview");
  }

  function openMap() {
    setPreviousView(view);
    setView("map");
  }

  function closeMap() {
    setView(previousView);
  }

  const locationUnavailable =
    (geoStatus === "denied" || geoStatus === "unavailable") && selected === null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="current-conditions">
          <LocationPanel
            currentLocation={currentLocation}
            favorites={favorites}
            favoritesError={favoritesError}
            selected={selected}
            onSelect={selectLocation}
            onAddFavorite={(candidate) => add(candidate)}
            onRemoveFavorite={remove}
            onDismissFavoritesError={clearError}
            geoStatus={geoStatus}
            onRequestCurrentLocation={requestLocation}
          />
          {selected !== null && (
            <span className="current-location-name">{selected.displayName}</span>
          )}
          {currentConditions !== null && (
            <>
              <span className="current-temperature">
                {formatValue(convertTemperature(currentConditions.temperature, unit), 0)}°
              </span>
              {currentConditionLabel !== null && (
                <span className="current-condition-label">{currentConditionLabel}</span>
              )}
              {currentFeelsLike !== null && (
                <span className="current-feels-like">
                  Feels like {formatValue(convertTemperature(currentFeelsLike, unit), 0)}°
                </span>
              )}
            </>
          )}
        </div>

        <div className="header-actions">
          <DisplayMenu
            theme={theme}
            onThemeChange={setTheme}
            unit={unit}
            onUnitChange={setUnit}
            highLowVisible={highLowVisible}
            onHighLowChange={setHighLowVisible}
          />
          {view !== "overview" && (
            <NearbyStationCountControl count={nearbyStationCount} onChange={setNearbyStationCount} />
          )}
          {/* "Back" always means "go to the Overview," everywhere in the app; "Details" always
              means "go to the Details table" — one consistent navigation vocabulary across
              Overview, graph, details, and map (020-dashboard-polish-round-five, US4). */}
          {view === "overview" && (
            <button type="button" onClick={() => setView("graph")}>
              Details
            </button>
          )}
          {view === "graph" && (
            <>
              <button type="button" onClick={() => setView("details")}>
                Details
              </button>
              <button type="button" onClick={viewOverview}>
                Back
              </button>
            </>
          )}
          {view === "details" && (
            <button type="button" onClick={viewOverview}>
              Back
            </button>
          )}
          {view === "map" ? (
            <button type="button" onClick={closeMap}>
              Back
            </button>
          ) : (
            <button type="button" onClick={openMap}>
              Map
            </button>
          )}
        </div>
      </header>

      {locationUnavailable && (
        <p className="error-banner" role="alert">
          We couldn't determine your current location. Search for a place below, or pick a saved
          favorite, to see its weather history instead.
        </p>
      )}

      {selected && view === "graph" && (
        <ObservationChart
          location={selected}
          window={obsWindow}
          onWindowChange={setObsWindow}
          metric={metric}
          onMetricChange={setMetric}
          highLowVisible={highLowVisible}
          unit={unit}
          series={series}
          nearbyStations={nearbyStations}
          multiSourceForecast={multiSourceForecast}
        />
      )}

      {selected && view === "details" && (
        <ObservationDetails
          location={selected}
          window={obsWindow}
          unit={unit}
          series={series}
          nearbyStations={nearbyStations}
        />
      )}

      {selected && view === "overview" && (
        <WeatherIconOverview
          location={selected}
          window={obsWindow}
          onWindowChange={setObsWindow}
          unit={unit}
          series={series}
          highLowVisible={highLowVisible}
          multiSourceForecast={multiSourceForecast}
          weeklySeries={weeklySeries}
        />
      )}

      {view === "map" && (
        <MapView
          favorites={favorites}
          cachedLocation={getCachedLocation()}
          onSelectLocation={selectLocation}
        />
      )}

      <Footer series={series} lastUpdated={lastUpdated} combinedForecast={multiSourceForecast.length > 1} />
    </div>
  );
}
