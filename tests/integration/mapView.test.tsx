import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MapView from "../../src/components/MapView";
import type { FavoritePlace, Location, WeatherObservation } from "../../src/models/types";

vi.mock("../../src/services/openMeteoProvider", () => ({
  getForecastOnly: vi.fn(),
}));

// react-leaflet's real CircleMarker (an SVG vector layer) throws under jsdom's layout-less
// environment (a Leaflet-under-jsdom limitation — jsdom has no real SVG renderer/pane sizing),
// the same class of issue the existing pin-click tests below already work around for Leaflet's
// double-tap-zoom detection. Replaced with a plain marker div carrying the same props as
// identifiable data-attributes, so tests can assert the overlay's presence/absence and its
// computed radius/opacity without touching Leaflet's real vector-rendering path.
vi.mock("react-leaflet", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-leaflet")>();
  return {
    ...actual,
    CircleMarker: (props: { radius: number; pathOptions?: { fillOpacity?: number } }) => (
      <div
        className="map-precipitation-circle"
        data-radius={props.radius}
        data-opacity={props.pathOptions?.fillOpacity}
      />
    ),
  };
});

import { getForecastOnly } from "../../src/services/openMeteoProvider";

const stockholm: FavoritePlace = {
  id: "1",
  latitude: 59.33,
  longitude: 18.06,
  displayName: "Stockholm",
  addedAt: "2026-01-01T00:00:00Z",
};

const paris: Location = {
  latitude: 48.85,
  longitude: 2.35,
  displayName: "Paris",
  source: "favorite",
};

describe("MapView (016-dashboard-polish-round-two, US10)", () => {
  beforeEach(() => {
    vi.mocked(getForecastOnly).mockReset();
    vi.mocked(getForecastOnly).mockResolvedValue([]);
  });

  it("shows an empty-state message when there are no favorites and no cached location", () => {
    render(<MapView favorites={[]} cachedLocation={null} onSelectLocation={vi.fn()} />);

    expect(screen.getByText(/no locations to show yet/i)).toBeInTheDocument();
  });

  it("shows a pin for each favorite; opening it and clicking 'View' calls onSelectLocation", async () => {
    const onSelectLocation = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={null} onSelectLocation={onSelectLocation} />
    );

    // Leaflet's Popup content only mounts once its marker is opened. A plain fireEvent click
    // (rather than userEvent's full pointer-event sequence) avoids tripping Leaflet's internal
    // double-tap-zoom detection, which throws under jsdom's zero-size layout (a known
    // Leaflet-under-jsdom limitation, the same class of issue as Recharts' <ResponsiveContainer>
    // elsewhere in this repo).
    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(1);
    fireEvent.click(container.querySelector(".leaflet-marker-icon")!);

    expect(await screen.findByText("Stockholm")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View" }));
    expect(onSelectLocation).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: stockholm.latitude, longitude: stockholm.longitude, displayName: "Stockholm" })
    );
  });

  it("also shows a pin for the cached location when it isn't already a favorite", async () => {
    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={paris} onSelectLocation={vi.fn()} />
    );

    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(2);
    await waitFor(() => expect(getForecastOnly).toHaveBeenCalledTimes(2));
  });

  it("does not duplicate a pin when the cached location is already a favorite", async () => {
    const cachedStockholm: Location = {
      latitude: stockholm.latitude,
      longitude: stockholm.longitude,
      displayName: "Stockholm",
      source: "favorite",
    };
    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={cachedStockholm} onSelectLocation={vi.fn()} />
    );

    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(1);
    await waitFor(() => expect(getForecastOnly).toHaveBeenCalledTimes(1));
  });
});

function forecastPoint(precipitation: number): WeatherObservation {
  return {
    timestamp: new Date(Date.now() + 3600_000).toISOString(),
    temperature: 10,
    precipitation,
    windSpeed: 1,
    cloudCoverPercent: 50,
    isForecast: true,
  };
}

describe("Precipitation overlay (031-map-precipitation-overlay)", () => {
  beforeEach(() => {
    vi.mocked(getForecastOnly).mockReset();
  });

  it("shows a precipitation circle for a pin with forecast rain, and none for a dry pin", async () => {
    vi.mocked(getForecastOnly).mockImplementation(async (location) =>
      location.latitude === stockholm.latitude ? [forecastPoint(2)] : [forecastPoint(0)]
    );

    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={paris} onSelectLocation={vi.fn()} />
    );

    await waitFor(() => expect(container.querySelectorAll(".map-precipitation-circle")).toHaveLength(1));
  });

  it("shows the forecast legend only when at least one pin has an overlay circle", async () => {
    vi.mocked(getForecastOnly).mockResolvedValue([forecastPoint(1)]);

    render(<MapView favorites={[stockholm]} cachedLocation={null} onSelectLocation={vi.fn()} />);

    expect(await screen.findByText(/forecast precipitation/i)).toBeInTheDocument();
  });

  it("still lets a pin's 'View' button call onSelectLocation with the overlay showing (US2)", async () => {
    vi.mocked(getForecastOnly).mockResolvedValue([forecastPoint(3)]);
    const onSelectLocation = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={null} onSelectLocation={onSelectLocation} />
    );

    await waitFor(() => expect(container.querySelectorAll(".map-precipitation-circle")).toHaveLength(1));

    fireEvent.click(container.querySelector(".leaflet-marker-icon")!);
    expect(await screen.findByText("Stockholm")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View" }));

    expect(onSelectLocation).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: stockholm.latitude, longitude: stockholm.longitude })
    );
  });

  it("still renders every pin when the precipitation fetch fails for all of them (US3)", async () => {
    vi.mocked(getForecastOnly).mockRejectedValue(new Error("network error"));

    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={paris} onSelectLocation={vi.fn()} />
    );

    await waitFor(() => expect(getForecastOnly).toHaveBeenCalledTimes(2));
    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(2);
    expect(container.querySelectorAll(".map-precipitation-circle")).toHaveLength(0);
  });

  it("still renders every pin's circle for the pins whose fetch succeeded, when only some fail (US3)", async () => {
    vi.mocked(getForecastOnly).mockImplementation(async (location) => {
      if (location.latitude === stockholm.latitude) return [forecastPoint(2)];
      throw new Error("network error");
    });

    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={paris} onSelectLocation={vi.fn()} />
    );

    await waitFor(() => expect(container.querySelectorAll(".map-precipitation-circle")).toHaveLength(1));
    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(2);
  });
});
