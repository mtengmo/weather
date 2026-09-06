import { describe, expect, it } from "vitest";
import { pointInPolygon, type GeoMultiPolygon, type GeoPolygon } from "../../src/services/geo";

// A simple square: lon 10-11, lat 55-56 (028-severe-weather-warnings, contracts/warnings.md).
const SQUARE: GeoPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [10, 55],
      [11, 55],
      [11, 56],
      [10, 56],
      [10, 55],
    ],
  ],
};

describe("geo.pointInPolygon (028-severe-weather-warnings)", () => {
  it("returns true for a point clearly inside a simple Polygon", () => {
    expect(pointInPolygon({ latitude: 55.5, longitude: 10.5 }, SQUARE)).toBe(true);
  });

  it("returns false for a point clearly outside a simple Polygon", () => {
    expect(pointInPolygon({ latitude: 60, longitude: 20 }, SQUARE)).toBe(false);
  });

  it("returns false for a point just past a boundary vertex", () => {
    expect(pointInPolygon({ latitude: 56.5, longitude: 10 }, SQUARE)).toBe(false);
  });

  it("returns true for a point inside either polygon of a MultiPolygon", () => {
    const multi: GeoMultiPolygon = {
      type: "MultiPolygon",
      coordinates: [
        SQUARE.coordinates,
        [
          [
            [20, 65],
            [21, 65],
            [21, 66],
            [20, 66],
            [20, 65],
          ],
        ],
      ],
    };

    expect(pointInPolygon({ latitude: 55.5, longitude: 10.5 }, multi)).toBe(true);
    expect(pointInPolygon({ latitude: 65.5, longitude: 20.5 }, multi)).toBe(true);
    expect(pointInPolygon({ latitude: 0, longitude: 0 }, multi)).toBe(false);
  });
});
