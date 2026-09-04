import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MapView from "../../src/components/MapView";
import type { FavoritePlace, Location } from "../../src/models/types";

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

  it("also shows a pin for the cached location when it isn't already a favorite", () => {
    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={paris} onSelectLocation={vi.fn()} />
    );

    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(2);
  });

  it("does not duplicate a pin when the cached location is already a favorite", () => {
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
  });
});
