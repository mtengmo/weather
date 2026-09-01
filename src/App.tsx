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
import UnitToggle from "./components/UnitToggle";
import ThemePicker from "./components/ThemePicker";
import NearbyStationCountControl from "./components/NearbyStationCountControl";
import HighLowToggle from "./components/HighLowToggle";
import LocationSwitcher from "./components/LocationSwitcher";
import FavoritesList from "./components/FavoritesList";
import PlaceSearch from "./components/PlaceSearch";

type View = "graph" | "details" | "overview";

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
  const [view, setView] = useState<View>("graph");

  const { series, nearbyStations } = useObservationData(selected, obsWindow, nearbyStationCount);

  useEffect(() => {
    requestLocation();
    // Request current location once on initial load (FR-003, SC-001).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentLocation && selected === null) {
      setSelected(currentLocation);
    }
  }, [currentLocation, selected]);

  function selectLocation(location: Location) {
    setSelected(location);
    setView("graph");
  }

  function viewOverview() {
    // The overview only supports 24h/7d (007-weather-icon-overview) — fall back to 24h if
    // the shared window is currently 30-day, rather than showing an invalid option there.
    if (obsWindow === "last-30-days") {
      setObsWindow("last-24-hours");
    }
    setView("overview");
  }

  const locationUnavailable =
    (geoStatus === "denied" || geoStatus === "unavailable") && selected === null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Weather History</h1>
        <div className="header-controls">
          <ThemePicker theme={theme} onChange={setTheme} />
          <UnitToggle unit={unit} onChange={setUnit} />
          <NearbyStationCountControl count={nearbyStationCount} onChange={setNearbyStationCount} />
          <HighLowToggle visible={highLowVisible} onChange={setHighLowVisible} />
        </div>
      </header>

      {locationUnavailable && (
        <p className="error-banner" role="alert">
          We couldn't determine your current location. Search for a place below, or pick a saved
          favorite, to see its weather history instead.
        </p>
      )}

      <LocationSwitcher
        currentLocation={currentLocation}
        favorites={favorites}
        selected={selected}
        onSelect={selectLocation}
      />

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
          onViewDetails={() => setView("details")}
          onViewOverview={viewOverview}
        />
      )}

      {selected && view === "details" && (
        <ObservationDetails
          location={selected}
          window={obsWindow}
          unit={unit}
          series={series}
          nearbyStations={nearbyStations}
          onBack={() => setView("graph")}
          onViewOverview={viewOverview}
        />
      )}

      {selected && view === "overview" && (
        <WeatherIconOverview
          location={selected}
          window={obsWindow}
          onWindowChange={setObsWindow}
          unit={unit}
          series={series}
          onBack={() => setView("graph")}
        />
      )}

      <PlaceSearch onSelect={(candidate) => add(candidate)} />

      <FavoritesList
        favorites={favorites}
        error={favoritesError}
        selectedId={
          favorites.find(
            (f) =>
              selected &&
              f.latitude === selected.latitude &&
              f.longitude === selected.longitude &&
              selected.source === "favorite"
          )?.id ?? null
        }
        onSelect={(place) =>
          selectLocation({
            latitude: place.latitude,
            longitude: place.longitude,
            displayName: place.displayName,
            source: "favorite",
          })
        }
        onRemove={remove}
        onDismissError={clearError}
      />
    </div>
  );
}
