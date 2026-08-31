import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LocationSwitcher from "../../src/components/LocationSwitcher";
import PlaceSearch from "../../src/components/PlaceSearch";
import FavoritesList from "../../src/components/FavoritesList";
import { useFavorites } from "../../src/hooks/useFavorites";
import type { FavoritePlace, Location } from "../../src/models/types";
import { FAVORITES_LIMIT } from "../../src/models/types";

vi.mock("../../src/services/geocodingApi", () => ({
  searchPlaces: vi.fn(),
}));

import { searchPlaces } from "../../src/services/geocodingApi";
import { addFavorite } from "../../src/services/favoritesStorage";

const currentLocation: Location = {
  latitude: 59.33,
  longitude: 18.06,
  displayName: "Current Location",
  source: "current-position",
};

describe("US3: LocationSwitcher — switching between current location and favorites", () => {
  const favorites: FavoritePlace[] = [
    { id: "1", latitude: 51.5, longitude: -0.12, displayName: "London", addedAt: "2026-01-01T00:00:00Z" },
    { id: "2", latitude: 48.85, longitude: 2.35, displayName: "Paris", addedAt: "2026-01-01T00:00:00Z" },
  ];

  it("calls onSelect with the correct location for current location and each favorite", async () => {
    const onSelect = vi.fn();
    render(
      <LocationSwitcher
        currentLocation={currentLocation}
        favorites={favorites}
        selected={currentLocation}
        onSelect={onSelect}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "London" }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "London", source: "favorite" })
    );

    await user.click(screen.getByRole("button", { name: "Paris" }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "Paris", source: "favorite" })
    );

    await user.click(screen.getByRole("button", { name: "Current Location" }));
    expect(onSelect).toHaveBeenCalledWith(currentLocation);
  });

  it("marks the currently selected location as pressed", () => {
    render(
      <LocationSwitcher
        currentLocation={currentLocation}
        favorites={favorites}
        selected={{ ...favorites[0], source: "favorite" } as unknown as Location}
        onSelect={vi.fn()}
      />
    );

    const nav = screen.getByRole("navigation", { name: "Select location" });
    expect(within(nav).getByRole("button", { name: "London" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});

function FavoritesHarness() {
  const { favorites, error, add, remove, clearError } = useFavorites();
  return (
    <div>
      <PlaceSearch onSelect={(candidate) => add(candidate)} />
      <FavoritesList
        favorites={favorites}
        error={error}
        selectedId={null}
        onSelect={() => {}}
        onRemove={remove}
        onDismissError={clearError}
      />
    </div>
  );
}

describe("US2: Favorites — search, add, persist, duplicate/limit, remove", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(searchPlaces).mockReset();
  });

  it("adds a searched place to favorites, and it persists across a fresh render (reload)", async () => {
    vi.mocked(searchPlaces).mockResolvedValue([
      { latitude: 59.33, longitude: 18.06, displayName: "Stockholm, Sweden" },
    ]);

    const user = userEvent.setup();
    const { unmount } = render(<FavoritesHarness />);

    await user.type(screen.getByLabelText("Search for a place"), "Stockholm");
    await user.click(await screen.findByRole("button", { name: "Add to favorites" }));

    expect(await screen.findByText("Stockholm, Sweden")).toBeInTheDocument();

    unmount(); // simulate closing the app
    render(<FavoritesHarness />);

    expect(screen.getByText("Stockholm, Sweden")).toBeInTheDocument();
  });

  it("rejects adding a duplicate place and shows an inline message", async () => {
    addFavorite({ latitude: 59.33, longitude: 18.06, displayName: "Stockholm, Sweden" });
    vi.mocked(searchPlaces).mockResolvedValue([
      { latitude: 59.33, longitude: 18.06, displayName: "Stockholm, Sweden" },
    ]);

    const user = userEvent.setup();
    render(<FavoritesHarness />);

    await user.type(screen.getByLabelText("Search for a place"), "Stockholm");
    await user.click(await screen.findByRole("button", { name: "Add to favorites" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already saved/i);
    expect(screen.getAllByText("Stockholm, Sweden")).toHaveLength(1);
  });

  it("blocks adding beyond the favorites limit and explains why", async () => {
    for (let i = 0; i < FAVORITES_LIMIT; i++) {
      addFavorite({ latitude: i, longitude: i, displayName: `Place ${i}` });
    }
    vi.mocked(searchPlaces).mockResolvedValue([
      { latitude: 99, longitude: 99, displayName: "One Too Many" },
    ]);

    const user = userEvent.setup();
    render(<FavoritesHarness />);

    await user.type(screen.getByLabelText("Search for a place"), "One Too Many");
    await user.click(await screen.findByRole("button", { name: "Add to favorites" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/up to 10/i);
  });

  it("removes a favorite and it no longer appears after a fresh render", async () => {
    addFavorite({ latitude: 1, longitude: 1, displayName: "Removable Place" });

    const user = userEvent.setup();
    const { unmount } = render(<FavoritesHarness />);

    expect(screen.getByText("Removable Place")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Removable Place" }));
    expect(screen.queryByText("Removable Place")).not.toBeInTheDocument();

    unmount();
    render(<FavoritesHarness />);
    expect(screen.queryByText("Removable Place")).not.toBeInTheDocument();
  });
});
