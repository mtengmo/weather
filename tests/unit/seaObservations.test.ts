import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSeaObservation, parseArchiveCsv, stationsByDistance } from "../../src/services/seaObservations";

afterEach(() => vi.unstubAllGlobals());

const st = (key: string, title: string, lat: number, lon: number, active = true) => ({
  key,
  title,
  summary: `Latitud: ${lat} Longitud: ${lon}`,
  active,
});
const stations = [
  st("far", "P - Far", 60, 20),
  st("near", "P - Near", 59.01, 18.01),
  st("dead", "P - Dead", 59, 18, false),
  { key: "nopos", title: "P - NoPos", summary: "x", active: true },
];

describe("stationsByDistance", () => {
  it("orders nearest first, skips inactive and position-less", () => {
    const r = stationsByDistance(stations, 59, 18);
    expect(r.map((s) => s.key)).toEqual(["near", "far"]);
    expect(r[0].name).toBe("Near");
    expect(r[0].distanceKm).toBeGreaterThan(0);
  });
});

type Handler = () => { ok: boolean; status?: number; body?: unknown };

function route(handlers: Record<string, Handler>, list = stations) {
  const fn = vi.fn(async (url: string) => {
    if (url.endsWith("/12.json")) return { ok: true, status: 200, json: async () => ({ station: list }) };
    const key = /station\/([^/]+)\//.exec(url)?.[1] ?? "";
    const r = handlers[key]?.() ?? { ok: false, status: 404 };
    return { ok: r.ok, status: r.status ?? 200, json: async () => r.body };
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("parseArchiveCsv", () => {
  const csv = [
    "Stationsnamn;Stationsid",
    "Arkö;2545",
    "",
    "Datum Tid (UTC);Havsvattenstånd;Kvalitet;Mätdjup (m);;Tidsutsnitt",
    "2026-10-20 23:00:00;5;G;0;;x",
    "2026-10-21 00:00:00;-2.5;G;0",
    "2026-10-21 01:00:00;;G;0",
    "2026-10-21 02:00:00;7;O;0",
  ].join("\n");

  it("keeps readings at or after the cutoff in order, skipping blanks and headers", () => {
    const since = Date.UTC(2026, 9, 21, 0, 0, 0);
    expect(parseArchiveCsv(csv, since)).toEqual([
      { time: since, value: -2.5 },
      { time: Date.UTC(2026, 9, 21, 2), value: 7 },
    ]);
  });
});

describe("fetchSeaObservation archive", () => {
  it("prepends archive readings older than the live ones", async () => {
    const live = Date.now() - 3600000;
    const old = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 13).replace("T", " ") + ":00:00";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/12.json")) return { ok: true, status: 200, json: async () => ({ station: stations }) };
        if (url.endsWith("data.csv")) return { ok: true, status: 200, text: async () => `${old};4;G;0\n` };
        return { ok: true, status: 200, json: async () => ({ value: [{ date: live, value: "9" }] }) };
      })
    );
    const r = await fetchSeaObservation("waterLevel", 59, 18);
    expect(r?.points.map((p) => p.value)).toEqual([4, 9]);
  });
});

describe("fetchSeaObservation", () => {
  it("returns raw unthinned points with station info", async () => {
    const value = Array.from({ length: 1000 }, (_, i) => ({ date: i * 60000, value: String(i) }));
    route({ near: () => ({ ok: true, body: { value } }) });
    const r = await fetchSeaObservation("waterLevel", 59, 18);
    expect(r?.points).toHaveLength(1000);
    expect(r?.station.key).toBe("near");
    expect(r?.station.name).toBe("Near");
  });

  it("falls back on 404 and empty data", async () => {
    const list = [st("a", "P - A", 59, 18), st("b", "P - B", 59.1, 18), st("c", "P - C", 59.2, 18)];
    route(
      {
        a: () => ({ ok: false, status: 404 }),
        b: () => ({ ok: true, body: { value: [] } }),
        c: () => ({ ok: true, body: { value: [{ date: 1, value: "2" }] } }),
      },
      list
    );
    const r = await fetchSeaObservation("waterLevel", 59, 18);
    expect(r?.station.key).toBe("c");
  });

  it("returns null after 5 failures and does not try a 6th", async () => {
    const list = Array.from({ length: 7 }, (_, i) => st(`s${i}`, `P - S${i}`, 59 + i * 0.1, 18));
    const f = route({}, list);
    expect(await fetchSeaObservation("waterLevel", 59, 18)).toBeNull();
    expect(f).toHaveBeenCalledTimes(1 + 5);
  });

  it("throws when station list fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })));
    await expect(fetchSeaObservation("waterLevel", 59, 18)).rejects.toThrow("503");
  });
});
