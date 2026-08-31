import { FAVORITES_LIMIT, type FavoritePlace } from "../models/types";

const STORAGE_KEY = "weather-app:favorites:v1";
const COORD_PRECISION = 4;

export class DuplicateFavoriteError extends Error {
  constructor() {
    super("This place is already saved as a favorite.");
    this.name = "DuplicateFavoriteError";
  }
}

export class FavoritesLimitReachedError extends Error {
  constructor() {
    super(`You can only save up to ${FAVORITES_LIMIT} favorite places.`);
    this.name = "FavoritesLimitReachedError";
  }
}

export class StorageUnavailableError extends Error {
  constructor() {
    super("Favorites can't be saved in this browser session.");
    this.name = "StorageUnavailableError";
  }
}

function roundCoord(value: number): number {
  return Number(value.toFixed(COORD_PRECISION));
}

function readAll(): FavoritePlace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FavoritePlace[]) : [];
  } catch {
    return [];
  }
}

function writeAll(favorites: FavoritePlace[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    throw new StorageUnavailableError();
  }
}

export function listFavorites(): FavoritePlace[] {
  return readAll();
}

export function addFavorite(
  place: Pick<FavoritePlace, "latitude" | "longitude" | "displayName">
): FavoritePlace {
  const favorites = readAll();

  const isDuplicate = favorites.some(
    (f) =>
      roundCoord(f.latitude) === roundCoord(place.latitude) &&
      roundCoord(f.longitude) === roundCoord(place.longitude)
  );
  if (isDuplicate) {
    throw new DuplicateFavoriteError();
  }

  if (favorites.length >= FAVORITES_LIMIT) {
    throw new FavoritesLimitReachedError();
  }

  const newFavorite: FavoritePlace = {
    id: crypto.randomUUID(),
    latitude: place.latitude,
    longitude: place.longitude,
    displayName: place.displayName,
    addedAt: new Date().toISOString(),
  };

  writeAll([...favorites, newFavorite]);
  return newFavorite;
}

export function removeFavorite(id: string): void {
  const favorites = readAll();
  writeAll(favorites.filter((f) => f.id !== id));
}
