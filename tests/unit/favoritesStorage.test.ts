import { beforeEach, describe, expect, it } from "vitest";
import {
  addFavorite,
  DuplicateFavoriteError,
  FavoritesLimitReachedError,
  listFavorites,
  removeFavorite,
} from "../../src/services/favoritesStorage";
import { FAVORITES_LIMIT } from "../../src/models/types";

describe("favoritesStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", () => {
    expect(listFavorites()).toEqual([]);
  });

  it("adds a favorite and persists it", () => {
    const added = addFavorite({ latitude: 59.33, longitude: 18.06, displayName: "Stockholm" });
    expect(listFavorites()).toHaveLength(1);
    expect(listFavorites()[0].id).toBe(added.id);
  });

  it("rejects a duplicate favorite by rounded coordinates", () => {
    addFavorite({ latitude: 59.3293, longitude: 18.0686, displayName: "Stockholm" });
    expect(() =>
      addFavorite({ latitude: 59.32931, longitude: 18.06861, displayName: "Stockholm (dup)" })
    ).toThrow(DuplicateFavoriteError);
    expect(listFavorites()).toHaveLength(1);
  });

  it("enforces the favorites limit", () => {
    for (let i = 0; i < FAVORITES_LIMIT; i++) {
      addFavorite({ latitude: i, longitude: i, displayName: `Place ${i}` });
    }
    expect(() =>
      addFavorite({ latitude: 99, longitude: 99, displayName: "One too many" })
    ).toThrow(FavoritesLimitReachedError);
    expect(listFavorites()).toHaveLength(FAVORITES_LIMIT);
  });

  it("removes a favorite by id", () => {
    const added = addFavorite({ latitude: 1, longitude: 1, displayName: "A" });
    removeFavorite(added.id);
    expect(listFavorites()).toEqual([]);
  });

  it("removing a non-existent id is a no-op", () => {
    addFavorite({ latitude: 1, longitude: 1, displayName: "A" });
    expect(() => removeFavorite("does-not-exist")).not.toThrow();
    expect(listFavorites()).toHaveLength(1);
  });
});
