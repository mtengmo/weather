import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import type { Location } from "../../src/models/types";

vi.mock("../../src/services/weatherApi", () => ({
  getObservations: vi.fn(),
  getNearbyStationSeries: vi.fn(),
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

  it("switches to the graph view when 'Back to graph' is clicked", async () => {
    addFavorite({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" });
    localStorage.setItem("weather-app:last-location:v1", JSON.stringify(stockholm));

    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Back to graph" }));

    expect(await screen.findByRole("heading", { name: "Stockholm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View details" })).toBeInTheDocument();
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
