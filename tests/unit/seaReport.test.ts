import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSeaReport,
  fetchSeaReport,
  parseAreas,
  pickCoastalArea,
  type CoastalArea,
} from "../../src/services/seaReport";

const square = (lon: number, lat: number, size = 1): CoastalArea["geometry"] => ({
  type: "Polygon",
  coordinates: [
    [
      [lon, lat],
      [lon + size, lat],
      [lon + size, lat + size],
      [lon, lat + size],
      [lon, lat],
    ],
  ],
});

const areas: CoastalArea[] = [
  { id: 107, name: "Sandhamn - Landsort", seaDistricts: [48], geometry: square(18, 59) },
  { id: 108, name: "Landsort - Arkosund", seaDistricts: [49, 50], geometry: square(16, 58) },
];

describe("pickCoastalArea", () => {
  it("returns the area containing the point", () => {
    const r = pickCoastalArea(areas, 59.5, 18.5);
    expect(r?.area.id).toBe(107);
    expect(r?.distanceKm).toBe(0);
  });

  it("falls back to the nearest area within range", () => {
    const r = pickCoastalArea(areas, 59.5, 19.2);
    expect(r?.area.id).toBe(107);
    expect(r!.distanceKm).toBeGreaterThan(0);
  });

  it("returns null when every area is too far", () => {
    expect(pickCoastalArea(areas, 65, 25)).toBeNull();
  });

  it("ignores non-coastal ids and areas without sea districts", () => {
    const odd: CoastalArea[] = [
      { id: 300, name: "Lake", seaDistricts: [1], geometry: square(18, 59) },
      { id: 5, name: "None", seaDistricts: [], geometry: square(18, 59) },
    ];
    expect(pickCoastalArea(odd, 59.5, 18.5)).toBeNull();
  });
});

describe("parseAreas", () => {
  it("is defensive about malformed input", () => {
    expect(parseAreas(null)).toEqual([]);
    expect(parseAreas({ features: [{}, { properties: { id: "x" } }] })).toEqual([]);
  });
});

const raw = {
  texts: {
    overview: "Vastlig vind.",
    updated: "2026-06-15T10:00:00Z",
    districts: [
      { ids: [48], text: "Text A" },
      { ids: [48, 99], text: "Text A" },
      { ids: [77], text: "Other" },
    ],
  },
  areas,
  forecasts: [{ id: 107, name: "Sandhamn", sky: "Mest sol", winds: [{ prefix: "Idag", text: "SV 5" }] }],
};

describe("buildSeaReport", () => {
  it("dedupes district texts and adds the Swedish area forecast", () => {
    const v = buildSeaReport(raw, 59.5, 18.5, "sv");
    expect(v.areaName).toBe("Sandhamn - Landsort");
    expect(v.areaTexts).toEqual(["Text A"]);
    expect(v.forecast).toEqual({ sky: "Mest sol", winds: [{ prefix: "Idag", text: "SV 5" }] });
  });

  it("omits the area forecast in English", () => {
    expect(buildSeaReport(raw, 59.5, 18.5, "en").forecast).toBeNull();
  });

  it("shows only the overview when too far from any area", () => {
    const v = buildSeaReport(raw, 65, 25, "sv");
    expect(v.overview).toBe("Vastlig vind.");
    expect(v.areaName).toBeNull();
    expect(v.areaTexts).toEqual([]);
  });
});

describe("fetchSeaReport", () => {
  afterEach(() => vi.unstubAllGlobals());

  const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

  it("parses the three endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("seacomment")) return ok(raw.texts);
        if (url.includes("coastlines-lakes")) {
          return ok({
            features: [
              {
                properties: { id: 107, name: "Sandhamn - Landsort", labelPos: [0, 0], seaDistricts: [48] },
                geometry: areas[0].geometry,
              },
            ],
          });
        }
        return ok([
          {
            id: 107,
            name: "Sandhamn",
            overview: { textSkyAndTempRange: "Mest sol", textsWind: [{ text: "SV 5", timePrefix: "Idag" }] },
          },
        ]);
      })
    );
    const r = await fetchSeaReport("sv");
    expect(r.texts.overview).toBe("Vastlig vind.");
    expect(r.areas).toHaveLength(1);
    expect(r.forecasts[0].winds).toEqual([{ prefix: "Idag", text: "SV 5" }]);
  });

  it("keeps the overview when optional endpoints fail, rejects when the text fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("seacomment")) return ok(raw.texts);
        throw new Error("down");
      })
    );
    const r = await fetchSeaReport("en");
    expect(r.areas).toEqual([]);

    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    await expect(fetchSeaReport("en")).rejects.toThrow();
  });
});
