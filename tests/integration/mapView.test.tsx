import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function mockRainviewer(response: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      status: ok ? 200 : 500,
      json: async () => response,
    }))
  );
}

describe("MapView (016-dashboard-polish-round-two, US10)", () => {
  beforeEach(() => {
    mockRainviewer({ host: "https://tilecache.rainviewer.com", radar: { past: [] } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

describe("Radar layer (032-dashboard-polish-round-seven, US1)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a radar TileLayer once RainViewer metadata resolves with at least one frame", async () => {
    mockRainviewer({
      host: "https://tilecache.rainviewer.com",
      radar: { past: [{ path: "/v2/radar/older" }, { path: "/v2/radar/latest" }] },
    });

    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={null} onSelectLocation={vi.fn()} />
    );

    await waitFor(() => expect(container.querySelector(".map-radar-layer")).not.toBeNull());
  });

  it("renders no radar layer, and every pin still renders, when the metadata fetch fails", async () => {
    mockRainviewer({}, false);

    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={paris} onSelectLocation={vi.fn()} />
    );

    await waitFor(() => expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(2));
    expect(container.querySelector(".map-radar-layer")).toBeNull();
  });

  it("renders no radar layer when RainViewer returns an empty frame list", async () => {
    mockRainviewer({ host: "https://tilecache.rainviewer.com", radar: { past: [] } });

    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={null} onSelectLocation={vi.fn()} />
    );

    await waitFor(() => expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(1));
    expect(container.querySelector(".map-radar-layer")).toBeNull();
  });

  it("still lets a pin's 'View' button call onSelectLocation with the radar layer showing", async () => {
    mockRainviewer({
      host: "https://tilecache.rainviewer.com",
      radar: { past: [{ path: "/v2/radar/latest" }] },
    });
    const onSelectLocation = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={null} onSelectLocation={onSelectLocation} />
    );

    await waitFor(() => expect(container.querySelector(".map-radar-layer")).not.toBeNull());

    fireEvent.click(container.querySelector(".leaflet-marker-icon")!);
    expect(await screen.findByText("Stockholm")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View" }));

    expect(onSelectLocation).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: stockholm.latitude, longitude: stockholm.longitude })
    );
  });
});

describe("Temperature overlay (040-map-temp-wind-overlays, US1)", () => {
  beforeEach(() => {
    mockRainviewer({ host: "https://tilecache.rainviewer.com", radar: { past: [] } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("renders a temperature TileLayer once selected, and removes it when a different overlay is selected", async () => {
    vi.stubEnv("VITE_OPENWEATHERMAP_API_KEY", "test-key");
    const user = userEvent.setup();
    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={null} onSelectLocation={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Temperature" }));
    expect(container.querySelector(".map-temperature-layer")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Rain" }));
    expect(container.querySelector(".map-temperature-layer")).toBeNull();
  });

  it("does not offer a Temperature option when no OpenWeatherMap API key is configured", () => {
    vi.stubEnv("VITE_OPENWEATHERMAP_API_KEY", "");
    render(<MapView favorites={[stockholm]} cachedLocation={null} onSelectLocation={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Temperature" })).not.toBeInTheDocument();
  });
});

describe("Wind overlay (040-map-temp-wind-overlays, US2)", () => {
  beforeEach(() => {
    mockRainviewer({ host: "https://tilecache.rainviewer.com", radar: { past: [] } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the Windy embed iframe, centered on the map's own coordinate, once selected", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={null} onSelectLocation={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Wind" }));

    const iframe = container.querySelector('iframe[title="Wind map"]');
    expect(iframe).not.toBeNull();
    const src = iframe!.getAttribute("src") ?? "";
    expect(src).toContain("embed.windy.com");
    expect(src).toContain("overlay=wind");
    expect(src).toContain(`lat=${stockholm.latitude}`);
    expect(src).toContain(`lon=${stockholm.longitude}`);
  });

  it("removes the Windy embed and restores the pin map when switching back to Rain", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={null} onSelectLocation={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Wind" }));
    expect(container.querySelector('iframe[title="Wind map"]')).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Rain" }));
    expect(container.querySelector('iframe[title="Wind map"]')).toBeNull();
    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(1);
  });
});

describe("Overlay picker guardrails (040-map-temp-wind-overlays, US3)", () => {
  beforeEach(() => {
    mockRainviewer({ host: "https://tilecache.rainviewer.com", radar: { past: [] } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("shows Rain as the default overlay on first render", () => {
    render(<MapView favorites={[stockholm]} cachedLocation={null} onSelectLocation={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Rain" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Wind" })).toHaveAttribute("aria-pressed", "false");
  });

  it("leaves exactly one overlay (or none) visible after rapidly switching between all of them", async () => {
    vi.stubEnv("VITE_OPENWEATHERMAP_API_KEY", "test-key");
    const user = userEvent.setup();
    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={null} onSelectLocation={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Wind" }));
    await user.click(screen.getByRole("button", { name: "Temperature" }));
    await user.click(screen.getByRole("button", { name: "None" }));

    expect(container.querySelector('iframe[title="Wind map"]')).toBeNull();
    expect(container.querySelector(".map-temperature-layer")).toBeNull();
    expect(container.querySelector(".map-radar-layer")).toBeNull();
    expect(screen.getByRole("button", { name: "None" })).toHaveAttribute("aria-pressed", "true");
  });

  it("still lets a pin's 'View' button call onSelectLocation with the Temperature overlay active", async () => {
    vi.stubEnv("VITE_OPENWEATHERMAP_API_KEY", "test-key");
    const onSelectLocation = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={null} onSelectLocation={onSelectLocation} />
    );

    await user.click(screen.getByRole("button", { name: "Temperature" }));
    fireEvent.click(container.querySelector(".leaflet-marker-icon")!);
    expect(await screen.findByText("Stockholm")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View" }));

    expect(onSelectLocation).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: stockholm.latitude, longitude: stockholm.longitude })
    );
  });

  it("still lets a pin's 'View' button call onSelectLocation with 'None' selected", async () => {
    const onSelectLocation = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={null} onSelectLocation={onSelectLocation} />
    );

    await user.click(screen.getByRole("button", { name: "None" }));
    fireEvent.click(container.querySelector(".leaflet-marker-icon")!);
    expect(await screen.findByText("Stockholm")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View" }));

    expect(onSelectLocation).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: stockholm.latitude, longitude: stockholm.longitude })
    );
  });

  it("renders no temperature layer, and every pin still renders, when no API key is configured", async () => {
    vi.stubEnv("VITE_OPENWEATHERMAP_API_KEY", "");
    const { container } = render(
      <MapView favorites={[stockholm]} cachedLocation={paris} onSelectLocation={vi.fn()} />
    );

    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(2);
    expect(container.querySelector(".map-temperature-layer")).toBeNull();
  });
});
