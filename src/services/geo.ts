/** A minimal subset of GeoJSON geometry types — just enough to represent an SMHI warning's
 *  `area` field (028-severe-weather-warnings, research.md §3). Coordinates are `[lon, lat]`
 *  pairs, per the GeoJSON spec. */
export interface GeoPolygon {
  type: "Polygon";
  coordinates: number[][][]; // rings[point][lon/lat]
}

export interface GeoMultiPolygon {
  type: "MultiPolygon";
  coordinates: number[][][][]; // polygons[rings[point][lon/lat]]
}

export type GeoGeometry = GeoPolygon | GeoMultiPolygon;

/** Standard ray-casting point-in-polygon test for one ring (an array of `[lon, lat]` vertices). */
function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * True when `point` falls inside (or on the boundary of, subject to floating-point precision)
 * any ring/polygon in `geometry` — supports both GeoJSON `Polygon` and `MultiPolygon`
 * (028-severe-weather-warnings, research.md §3, contracts/warnings.md). Pure, no I/O, no
 * exceptions for well-formed GeoJSON input.
 */
export function pointInPolygon(
  point: { latitude: number; longitude: number },
  geometry: GeoGeometry
): boolean {
  const { latitude: lat, longitude: lon } = point;

  if (geometry.type === "Polygon") {
    return geometry.coordinates.some((ring) => pointInRing(lon, lat, ring));
  }

  return geometry.coordinates.some((polygon) => polygon.some((ring) => pointInRing(lon, lat, ring)));
}
