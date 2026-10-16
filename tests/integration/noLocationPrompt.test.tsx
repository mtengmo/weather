import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NoLocationPrompt from "../../src/components/NoLocationPrompt";

vi.mock("../../src/services/geocodingApi", () => ({ searchPlaces: vi.fn().mockResolvedValue([]) }));

describe("NoLocationPrompt", () => {
  it("offers search, favorites and a retry-location button", async () => {
    const onSelect = vi.fn();
    const onRetry = vi.fn();
    render(
      <NoLocationPrompt
        favorites={[{ id: "1", displayName: "Malmö", latitude: 55.6, longitude: 13, createdAt: "" } as never]}
        favoritesError={null}
        onSelect={onSelect}
        onAddFavorite={vi.fn()}
        onRemoveFavorite={vi.fn()}
        onDismissFavoritesError={vi.fn()}
        onRequestCurrentLocation={onRetry}
      />
    );
    expect(screen.getByRole("heading", { name: "Choose a location" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Use my location" }));
    expect(onRetry).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Malmö" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Malmö", source: "favorite" }));
  });
});
