import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import type { Location } from "../../src/models/types";
import { clickMenuItem, menuItemNames, openSettings } from "../helpers/headerMenu";

vi.mock("../../src/services/weatherApi", () => ({
  getObservations: vi.fn(),
  getNearbyStationSeries: vi.fn(),
  // getMultiSourceForecast is now always fetched, unconditionally
  // (020-dashboard-polish-round-five, US2 — no toggle to gate it).
  getMultiSourceForecast: vi.fn().mockResolvedValue([]),
  getUvRisk: vi.fn().mockResolvedValue(new Set()),
  getWarningsForLocation: vi.fn().mockResolvedValue([]),
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

import { getMultiSourceForecast, getNearbyStationSeries, getObservations } from "../../src/services/weatherApi";
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

  it("has no standalone 'Tengmo Väder' heading", () => {
    render(<App />);

    expect(screen.queryByRole("heading", { name: "Tengmo Väder" })).not.toBeInTheDocument();
  });

  it("shows the Tengmo Väder logo in the header (035-fix-temp-scale-logo)", () => {
    render(<App />);

    expect(screen.getByAltText("Tengmo Väder")).toBeInTheDocument();
  });
});

describe("Location Panel (013-overview-default-and-layout, US2)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGeolocation("success");
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
    expect(header).toContainElement(screen.getByRole("button", { name: /Change location/ }));
    expect(screen.queryByLabelText("Search for a place")).not.toBeInTheDocument();
    expect(screen.queryByText("Favorite places")).not.toBeInTheDocument();
  });

  it("opens the panel to reveal current-location, favorites, and search together", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Change location/ }));

    expect(screen.getByLabelText("Search for a place")).toBeInTheDocument();
    expect(screen.getByText("Favorite places")).toBeInTheDocument();
  });

  it("selects a favorite from the panel, switches the app to it, and closes the panel", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Change location/ }));
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

    await user.click(screen.getByRole("button", { name: /Change location/ }));
    await user.type(screen.getByLabelText("Search for a place"), "Paris");
    await user.click(await screen.findByRole("button", { name: "Add to favorites" }));

    expect(await screen.findByText("Paris")).toBeInTheDocument();
    expect(screen.getByLabelText("Search for a place")).toBeInTheDocument();
  });

  it("keeps the panel open when removing a favorite", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Change location/ }));
    await user.click(screen.getByRole("button", { name: "Remove Stockholm" }));

    expect(screen.queryByText("Stockholm")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search for a place")).toBeInTheDocument();
  });

  it("closes the panel on Escape without changing the selected location", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Change location/ }));
    expect(screen.getByLabelText("Search for a place")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByLabelText("Search for a place")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Stockholm/ })).not.toBeInTheDocument();
  });

  it("closes the panel on an outside click without changing the selected location", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Change location/ }));
    expect(screen.getByLabelText("Search for a place")).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByLabelText("Search for a place")).not.toBeInTheDocument();
  });

  it("marks the currently-selected location within the panel", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Change location/ }));
    await user.click(screen.getByRole("button", { name: "Stockholm" }));
    await user.click(await screen.findByRole("button", { name: /Change location/ }));

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

    await clickMenuItem(user, "Show details");

    expect(await screen.findByRole("heading", { name: "Stockholm" })).toBeInTheDocument();
    // From the graph view, "Show details" (→ the details table) and "Show overview" (→ Overview) both remain
    // available (020-dashboard-polish-round-five, US4 — replaces the old "View details" button).
    expect(await menuItemNames(user)).toEqual(
      expect.arrayContaining(["Show details", "Show overview", "Rain map"])
    );
  });

  it("shows a 'Details' button in the persistent header on the Overview and the graph view, and a 'Back' button once past the Overview (020-dashboard-polish-round-five, US4)", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("heading", { name: /Stockholm.*overview/i });
    const overviewItems = await menuItemNames(user);
    expect(overviewItems).toContain("Show details");
    expect(overviewItems).not.toContain("Show overview");

    await clickMenuItem(user, "Show details");
    // Now on the graph view: "Show details" (→ the details table) and "Show overview" (→ Overview) both show.
    const graphItems = await menuItemNames(user);
    expect(graphItems).toContain("Show details");
    expect(graphItems).toContain("Show overview");
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

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't find your location/i);
    expect(screen.queryByRole("heading", { name: /Stockholm/ })).not.toBeInTheDocument();
  });

  it("falls back to default behavior when the cached favorite no longer exists", async () => {
    // No addFavorite call — the cached favorite has since been removed.
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't find your location/i);
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

    await user.click(screen.getByRole("button", { name: /Change location/ }));
    await user.type(screen.getByLabelText("Search for a place"), "Paris");
    await user.click(await screen.findByRole("button", { name: "Show weather" }));

    expect(await screen.findByRole("heading", { name: /Paris.*overview/i })).toBeInTheDocument();
    // Viewing must not implicitly favorite it (FR-002) — reopen the panel and confirm it's
    // absent from the favorites list specifically (scoped since 019's header now also shows
    // the current location's name, which is the same text and would otherwise false-positive).
    await user.click(screen.getByRole("button", { name: /Change location/ }));
    const favoritesList = document.querySelector(".favorites-list");
    expect(favoritesList).not.toHaveTextContent("Paris, France");
  });

  it("shows only the place name in the header after selecting a search result, not the full region/country string (049-show-only-place)", async () => {
    const { searchPlaces } = await import("../../src/services/geocodingApi");
    vi.mocked(searchPlaces).mockResolvedValue([
      { latitude: 59.86, longitude: 17.64, displayName: "Uppsala, Uppsala County, Sweden" },
    ]);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Change location/ }));
    // The search-results dropdown itself keeps the full disambiguating name (FR-002).
    await user.type(screen.getByLabelText("Search for a place"), "Uppsala");
    expect(await screen.findByText("Uppsala, Uppsala County, Sweden")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show weather" }));

    const header = screen.getByRole("button", { name: /Change location/ });
    expect(header).toHaveTextContent("Uppsala");
    expect(header).not.toHaveTextContent("Uppsala County");
    expect(header).not.toHaveTextContent("Sweden");
  });

  it("still supports adding a search result to favorites as a separate action", async () => {
    const { searchPlaces } = await import("../../src/services/geocodingApi");
    vi.mocked(searchPlaces).mockResolvedValue([
      { latitude: 48.85, longitude: 2.35, displayName: "Paris, France" },
    ]);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Change location/ }));
    await user.type(screen.getByLabelText("Search for a place"), "Paris");
    await user.click(await screen.findByRole("button", { name: "Add to favorites" }));

    // The favorites list shows just the place name (049-show-only-place) — the search dropdown
    // itself has already cleared by this point (PlaceSearch resets its query/results on add).
    expect(await screen.findByText("Paris")).toBeInTheDocument();
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

    await user.click(await screen.findByRole("button", { name: /Change location/ }));

    expect(screen.getAllByRole("button", { name: "Use my location" })[0]).toBeInTheDocument();
  });

  it("retrying current location shows that location's weather once granted", async () => {
    mockGeolocation("unavailable");
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /Change location/ }));
    await user.click(screen.getAllByRole("button", { name: "Use my location" })[0]);

    // Second request behaves like the first — switch the mock to "success" and re-fire it.
    mockGeolocation("success");
    await user.click(screen.getAllByRole("button", { name: "Use my location" })[0]);

    expect(await screen.findByRole("button", { name: "My location" })).toBeInTheDocument();
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
    await openSettings(user);
    expect(screen.queryByLabelText(/nearby stations/i)).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    await clickMenuItem(user, "Show details");
    await openSettings(user);
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
    expect(screen.getByRole("button", { name: /Change location/ })).toBeInTheDocument();

    await clickMenuItem(user, "Show details");
    expect(screen.getByRole("button", { name: /Change location/ })).toBeInTheDocument();

    await clickMenuItem(user, "Show details");
    expect(screen.getByRole("button", { name: /Change location/ })).toBeInTheDocument();
  });

  it("shows 'Change location' on the map view (016-dashboard-polish-round-two, US10)", async () => {
    const user = userEvent.setup();
    render(<App />);

    await clickMenuItem(user, "Rain map");
    expect(screen.getByRole("button", { name: /Change location/ })).toBeInTheDocument();
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

  it("no longer shows a current-conditions reading inline in the header — it moved to the Today card's 'Now' line (037-header-controls-and-chart-fixes follow-up: header wrapped with a long location name)", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    render(<App />);

    const todayCard = await screen.findByRole("region", { name: "Today" });
    await waitFor(() => expect(todayCard).toHaveTextContent("12°"));
    expect(todayCard).toHaveTextContent(/feels like \d+°/);

    const header = screen.getByRole("banner");
    expect(header).not.toHaveTextContent("12°");
    expect(header).not.toHaveTextContent(/feels like/i);
  });

  it("no longer offers a Display menu (037-header-controls-and-chart-fixes, US1/US2)", () => {
    render(<App />);

    expect(screen.queryByRole("button", { name: "Display" })).not.toBeInTheDocument();
  });

  it("shows a single Dark/Light button in the header that switches the theme in one click, labeled with the destination (US1, later flipped to destination-labeled)", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(document.documentElement.getAttribute("data-theme")).toBe("midnight");
    // The menu item states the CURRENT theme, so it is never ambiguous whether it is a state or an action.
    expect(await menuItemNames(user)).toContainEqual(expect.stringMatching(/^Theme: Dark/));

    await clickMenuItem(user, /^Theme: Dark/);

    expect(document.documentElement.getAttribute("data-theme")).toBe("ivory");
    expect(await menuItemNames(user)).toContainEqual(expect.stringMatching(/^Theme: Light/));
  });

  it("opens the Settings menu to reveal only unit and high/low controls, and toggles the unit (US2)", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openSettings(user);

    const settingsPanel = screen.getByRole("button", { name: /Fahrenheit|°F/i }).closest(".settings-menu-content");
    expect(settingsPanel).not.toBeNull();
    expect(settingsPanel).toHaveTextContent(/high\/low/i);
    expect(settingsPanel!.querySelector(".theme-toggle")).toBeNull();
  });

  it("defaults high/low markers off for a viewer with no saved preference (US2)", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openSettings(user);

    expect(screen.getByRole("button", { name: "Hide high/low lines" })).toHaveAttribute("aria-pressed", "true");
  });

  it("preserves a previously saved high/low preference (US2)", async () => {
    localStorage.setItem("weather-app:high-low-visible:v1", "true");
    const user = userEvent.setup();
    render(<App />);

    await openSettings(user);

    expect(screen.getByRole("button", { name: "Show high/low lines" })).toHaveAttribute("aria-pressed", "true");
  });

  it("no longer offers a Forecast sources control (020-dashboard-polish-round-five, US2)", () => {
    render(<App />);

    expect(screen.queryByRole("button", { name: /Forecast sources/ })).not.toBeInTheDocument();
  });

  it("keeps Map and Details reachable from the header", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    const user = userEvent.setup();
    render(<App />);

    const names = await menuItemNames(user);
    expect(names).toContain("Show details");
    expect(names).toContain("Rain map");
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

    await clickMenuItem(user, "Show details");
    expect(header).toHaveTextContent("Stockholm");

    await clickMenuItem(user, "Show details");
    expect(header).toHaveTextContent("Stockholm");

    await clickMenuItem(user, "Rain map");
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
    await clickMenuItem(user, "Rain map");
    expect(await menuItemNames(user)).not.toContain("Rain map");

    await clickMenuItem(user, "Show overview");
    expect(await screen.findByRole("heading", { name: /Stockholm.*overview/i })).toBeInTheDocument();
    expect(await menuItemNames(user)).toContain("Rain map");
  });

  it("returns to the Overview — not the graph view — even when the map was opened from there (032-dashboard-polish-round-seven, US3)", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    const user = userEvent.setup();
    render(<App />);

    await clickMenuItem(user, "Show details");
    await screen.findByRole("heading", { name: "Stockholm" });

    await clickMenuItem(user, "Rain map");
    await clickMenuItem(user, "Show overview");

    // "Show overview" always means the Overview — not back to whichever view was open before the Map.
    expect(await screen.findByRole("heading", { name: /Stockholm.*overview/i })).toBeInTheDocument();
    expect(await menuItemNames(user)).toContain("Rain map");
  });
});

describe("Nearby-station data is deferred until Details/graph is opened (025-reduce-api-requests, US1)", () => {
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

  it("does not fetch nearby-station data on the Overview", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    render(<App />);

    await screen.findByRole("heading", { name: /Stockholm.*overview/i });
    expect(getNearbyStationSeries).not.toHaveBeenCalled();
  });

  it("fetches nearby-station data once the Details/graph view is opened for the first time", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("heading", { name: /Stockholm.*overview/i });
    expect(getNearbyStationSeries).not.toHaveBeenCalled();

    await clickMenuItem(user, "Show details");

    await waitFor(() => expect(getNearbyStationSeries).toHaveBeenCalledTimes(1));

    // Returning to the Overview must not clear or re-fetch nearby-station data.
    await clickMenuItem(user, "Show overview");
    await screen.findByRole("heading", { name: /Stockholm.*overview/i });
    expect(getNearbyStationSeries).toHaveBeenCalledTimes(1);
  });
});

describe("Debug panel (060-debug-page-bottom)", () => {
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
    vi.mocked(getMultiSourceForecast).mockReset();
    vi.mocked(getMultiSourceForecast).mockResolvedValue([
      { source: "smhi", observations: [], issuedAt: null, rawResponse: { approvedTime: "smhi-raw" } },
      { source: "open-meteo", observations: [], rawResponse: { hourly: "open-meteo-raw" } },
    ]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a collapsed debug section with a heading per source, without any extra fetch of forecast data (FR-002)", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("heading", { name: /Stockholm.*overview/i });
    await waitFor(() => expect(getMultiSourceForecast).toHaveBeenCalledTimes(1));

    const summary = screen.getByText("Debug: raw source responses");
    expect(summary).toBeInTheDocument();
    expect(screen.getByText(/smhi-raw/)).not.toBeVisible();

    await user.click(summary);

    expect(screen.getByRole("heading", { name: "SMHI" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Open-Meteo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "MET Norway" })).toBeInTheDocument();
    expect(screen.getByText(/smhi-raw/)).toBeVisible();
    expect(screen.getByText(/open-meteo-raw/)).toBeVisible();
    expect(screen.getByText("No data")).toBeInTheDocument();

    // Opening the panel must not trigger any additional forecast fetch (FR-002).
    expect(getMultiSourceForecast).toHaveBeenCalledTimes(1);
  });
});
