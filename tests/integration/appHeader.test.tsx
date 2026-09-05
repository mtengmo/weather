import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import type { Location } from "../../src/models/types";

vi.mock("../../src/services/weatherApi", () => ({
  getObservations: vi.fn(),
  getNearbyStationSeries: vi.fn(),
  // getMultiSourceForecast is now always fetched, unconditionally
  // (020-dashboard-polish-round-five, US2 — no toggle to gate it).
  getMultiSourceForecast: vi.fn().mockResolvedValue([]),
}));
vi.mock("../../src/services/smhiProvider", () => ({
  getNearestStations: vi.fn(),
}));
vi.mock("../../src/services/geocoding", () => ({
  reverseGeocode: vi.fn(),
}));
vi.mock("../../src/services/geocodingApi", () => ({
  searchPlaces: vi.fn(),
}));

import { getNearbyStationSeries, getObservations } from "../../src/services/weatherApi";
import { getNearestStations } from "../../src/services/smhiProvider";
import { addFavorite } from "../../src/services/favoritesStorage";

const stockholm: Location = {
  latitude: 59.33,
  longitude: 18.06,
  displayName: "Stockholm",
  source: "favorite",
};

function mockGeolocation(behavior: "success" | "unavailable" = "unavailable") {
  const getCurrentPosition = vi.fn(
    (success: PositionCallback, error?: PositionErrorCallback) => {
      if (behavior === "success") {
        success({
          coords: { latitude: 59.33, longitude: 18.06, accuracy: 1 },
        } as GeolocationPosition);
      } else if (error) {
        error({
          code: 2,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: "",
        } as GeolocationPositionError);
      }
    }
  );
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
}

describe("App header consolidation (009-timeline-polish-and-header, US1)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocation("unavailable");
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getNearestStations).mockReset();
    vi.mocked(getNearestStations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("has no standalone 'Weather History' heading", () => {
    render(<App />);

    expect(screen.queryByRole("heading", { name: "Weather History" })).not.toBeInTheDocument();
  });
});

describe("Location Panel (013-overview-default-and-layout, US2)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocation("unavailable");
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [],
    });
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getNearestStations).mockReset();
    vi.mocked(getNearestStations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a single 'Change location' control in the header instead of always-visible search/favorites sections", () => {
    render(<App />);

    const header = screen.getByRole("banner");
    expect(header).toContainElement(screen.getByRole("button", { name: "Change location" }));
    expect(screen.queryByLabelText("Search for a place")).not.toBeInTheDocument();
    expect(screen.queryByText("Favorite places")).not.toBeInTheDocument();
  });

  it("opens the panel to reveal current-location, favorites, and search together", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Change location" }));

    expect(screen.getByLabelText("Search for a place")).toBeInTheDocument();
    expect(screen.getByText("Favorite places")).toBeInTheDocument();
  });

  it("selects a favorite from the panel, switches the app to it, and closes the panel", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Change location" }));
    await user.click(screen.getByRole("button", { name: "Stockholm" }));

    expect(await screen.findByRole("heading", { name: /Stockholm/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Search for a place")).not.toBeInTheDocument();
  });

  it("keeps the panel open when adding a favorite via search", async () => {
    const { searchPlaces } = await import("../../src/services/geocodingApi");
    vi.mocked(searchPlaces).mockResolvedValue([
      { latitude: 48.85, longitude: 2.35, displayName: "Paris, France" },
    ]);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Change location" }));
    await user.type(screen.getByLabelText("Search for a place"), "Paris");
    await user.click(await screen.findByRole("button", { name: "Add to favorites" }));

    expect(await screen.findByText("Paris, France")).toBeInTheDocument();
    expect(screen.getByLabelText("Search for a place")).toBeInTheDocument();
  });

  it("keeps the panel open when removing a favorite", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Change location" }));
    await user.click(screen.getByRole("button", { name: "Remove Stockholm" }));

    expect(screen.queryByText("Stockholm")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search for a place")).toBeInTheDocument();
  });

  it("closes the panel on Escape without changing the selected location", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Change location" }));
    expect(screen.getByLabelText("Search for a place")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByLabelText("Search for a place")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Stockholm/ })).not.toBeInTheDocument();
  });

  it("closes the panel on an outside click without changing the selected location", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Change location" }));
    expect(screen.getByLabelText("Search for a place")).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByLabelText("Search for a place")).not.toBeInTheDocument();
  });

  it("marks the currently-selected location within the panel", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Change location" }));
    await user.click(screen.getByRole("button", { name: "Stockholm" }));
    await user.click(await screen.findByRole("button", { name: "Change location" }));

    expect(screen.getByRole("button", { name: "Stockholm" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Default view is the Overview (013-overview-default-and-layout, US1)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocation("unavailable");
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [],
    });
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getNearestStations).mockReset();
    vi.mocked(getNearestStations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the Overview timeline, not the graph, on a fresh render with a resolvable location", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    render(<App />);

    expect(await screen.findByRole("heading", { name: /Stockholm.*overview/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View details" })).not.toBeInTheDocument();
  });

  it("switches to the graph view when 'Details' is clicked", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Details" }));

    expect(await screen.findByRole("heading", { name: "Stockholm" })).toBeInTheDocument();
    // From the graph view, "Details" (→ the details table) and "Back" (→ Overview) both remain
    // available (020-dashboard-polish-round-five, US4 — replaces the old "View details" button).
    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("shows a 'Details' button in the persistent header on the Overview and the graph view, and a 'Back' button once past the Overview (020-dashboard-polish-round-five, US4)", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    const user = userEvent.setup();
    render(<App />);

    const detailsButton = await screen.findByRole("button", { name: "Details" });
    expect(screen.getByRole("banner")).toContainElement(detailsButton);
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();

    await user.click(detailsButton);
    // Now on the graph view: "Details" (→ the details table) and "Back" (→ Overview) both show.
    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });
});

describe("Cached location restore (009-timeline-polish-and-header, US4)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocation("unavailable");
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [],
    });
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getNearestStations).mockReset();
    vi.mocked(getNearestStations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("restores a cached favorite on load without requiring re-selection", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    render(<App />);

    expect(await screen.findByRole("heading", { name: /Stockholm/ })).toBeInTheDocument();
  });

  it("falls back to default behavior when no location is cached", async () => {
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't determine your current location/i);
    expect(screen.queryByRole("heading", { name: /Stockholm/ })).not.toBeInTheDocument();
  });

  it("falls back to default behavior when the cached favorite no longer exists", async () => {
    // No addFavorite call — the cached favorite has since been removed.
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't determine your current location/i);
    expect(screen.queryByRole("heading", { name: /Stockholm/ })).not.toBeInTheDocument();
  });
});

describe("View a search result without favoriting (014-dashboard-usability-fixes, US1)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocation("unavailable");
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [],
    });
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getNearestStations).mockReset();
    vi.mocked(getNearestStations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("views a search result's weather without adding it to favorites", async () => {
    const { searchPlaces } = await import("../../src/services/geocodingApi");
    vi.mocked(searchPlaces).mockResolvedValue([
      { latitude: 48.85, longitude: 2.35, displayName: "Paris, France" },
    ]);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Change location" }));
    await user.type(screen.getByLabelText("Search for a place"), "Paris");
    await user.click(await screen.findByRole("button", { name: "View" }));

    expect(await screen.findByRole("heading", { name: /Paris.*overview/i })).toBeInTheDocument();
    // Viewing must not implicitly favorite it (FR-002) — reopen the panel and confirm it's
    // absent from the favorites list specifically (scoped since 019's header now also shows
    // the current location's name, which is the same text and would otherwise false-positive).
    await user.click(screen.getByRole("button", { name: "Change location" }));
    const favoritesList = document.querySelector(".favorites-list");
    expect(favoritesList).not.toHaveTextContent("Paris, France");
  });

  it("still supports adding a search result to favorites as a separate action", async () => {
    const { searchPlaces } = await import("../../src/services/geocodingApi");
    vi.mocked(searchPlaces).mockResolvedValue([
      { latitude: 48.85, longitude: 2.35, displayName: "Paris, France" },
    ]);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Change location" }));
    await user.type(screen.getByLabelText("Search for a place"), "Paris");
    await user.click(await screen.findByRole("button", { name: "Add to favorites" }));

    expect(await screen.findByText("Paris, France")).toBeInTheDocument();
  });
});

describe("Retry current location after denial (014-dashboard-usability-fixes, US2)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [],
    });
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getNearestStations).mockReset();
    vi.mocked(getNearestStations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers a way to retry current location after the permission prompt is denied", async () => {
    mockGeolocation("unavailable"); // simulates a denial via the mocked error callback
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Change location" }));

    expect(screen.getByRole("button", { name: "Use current location" })).toBeInTheDocument();
  });

  it("retrying current location shows that location's weather once granted", async () => {
    mockGeolocation("unavailable");
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Change location" }));
    await user.click(screen.getByRole("button", { name: "Use current location" }));

    // Second request behaves like the first — switch the mock to "success" and re-fire it.
    mockGeolocation("success");
    await user.click(screen.getByRole("button", { name: "Use current location" }));

    expect(await screen.findByRole("button", { name: "Current Location" })).toBeInTheDocument();
  });
});

describe("Nearby-stations control hidden on the Overview (014-dashboard-usability-fixes, US5)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocation("unavailable");
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [],
    });
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getNearestStations).mockReset();
    vi.mocked(getNearestStations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hides the nearby-stations control on the Overview and shows it on the graph", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("heading", { name: /Stockholm.*overview/i });
    expect(screen.queryByLabelText(/nearby stations/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByLabelText(/nearby stations/i)).toBeInTheDocument();
  });
});

describe("Change location reachable from every screen (016-dashboard-polish-round-two, US6)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocation("unavailable");
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [],
    });
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getNearestStations).mockReset();
    vi.mocked(getNearestStations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows 'Change location' on the overview, and after switching to the graph and details views", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("heading", { name: /Stockholm.*overview/i });
    expect(screen.getByRole("button", { name: "Change location" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByRole("button", { name: "Change location" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByRole("button", { name: "Change location" })).toBeInTheDocument();
  });

  it("shows 'Change location' on the map view (016-dashboard-polish-round-two, US10)", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Map" }));
    expect(screen.getByRole("button", { name: "Change location" })).toBeInTheDocument();
  });
});

describe("Consolidated header controls (018-dashboard-visual-redesign, US1)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocation("unavailable");
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      primarySource: "smhi",
      observations: [
        { timestamp: new Date().toISOString(), temperature: 12, precipitation: 0, windSpeed: 2, cloudCoverPercent: 10, relativeHumidity: 60 },
      ],
    });
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getNearestStations).mockReset();
    vi.mocked(getNearestStations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the current temperature, condition, and feels-like reading inline in the header", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    render(<App />);

    const header = screen.getByRole("banner");
    await waitFor(() => expect(header).toHaveTextContent("12°"));
    expect(header).toHaveTextContent(/Feels like/);
  });

  it("opens the Display menu to reveal theme/unit/high-low controls, and toggles the unit", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Display" }));

    expect(screen.getByRole("button", { name: /Fahrenheit|°F/i })).toBeInTheDocument();
  });

  it("no longer offers a Forecast sources control (020-dashboard-polish-round-five, US2)", () => {
    render(<App />);

    expect(screen.queryByRole("button", { name: /Forecast sources/ })).not.toBeInTheDocument();
  });

  it("keeps Map and Details reachable from the header", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    render(<App />);

    expect(await screen.findByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Map" })).toBeInTheDocument();
  });
});

describe("Location name visible in the header (019-dashboard-polish-round-four, US1)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocation("unavailable");
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [],
    });
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getNearestStations).mockReset();
    vi.mocked(getNearestStations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the selected location's name in the header on the Overview, graph, details, and map views", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    const user = userEvent.setup();
    render(<App />);

    const header = screen.getByRole("banner");
    await waitFor(() => expect(header).toHaveTextContent("Stockholm"));

    await user.click(await screen.findByRole("button", { name: "Details" }));
    expect(header).toHaveTextContent("Stockholm");

    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(header).toHaveTextContent("Stockholm");

    await user.click(screen.getByRole("button", { name: "Map" }));
    expect(header).toHaveTextContent("Stockholm");
  });
});

describe("Map view has a way back (019-dashboard-polish-round-four, US2)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocation("unavailable");
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      status: "ready",
      observations: [],
    });
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getNearestStations).mockReset();
    vi.mocked(getNearestStations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns to the Overview after opening the map from there", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("heading", { name: /Stockholm.*overview/i });
    await user.click(screen.getByRole("button", { name: "Map" }));
    expect(screen.queryByRole("button", { name: "Map" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByRole("heading", { name: /Stockholm.*overview/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Map" })).toBeInTheDocument();
  });

  it("returns to the graph view after opening the map from there", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Details" }));
    await screen.findByRole("heading", { name: "Stockholm" });

    await user.click(screen.getByRole("button", { name: "Map" }));
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(await screen.findByRole("heading", { name: "Stockholm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
  });
});
