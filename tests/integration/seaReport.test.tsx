import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SeaReport from "../../src/components/SeaReport";
import { clearSeaReportCache } from "../../src/hooks/useSeaReport";

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const sq = [
  [
    [18, 59],
    [19, 59],
    [19, 60],
    [18, 60],
    [18, 59],
  ],
];

describe("SeaReport", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 5, 15, 12, 0, 0) });
    clearSeaReportCache();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders the overview, area name and district text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("seacomment")) {
          return ok({
            overview: "Overview sentence.",
            updated: "2026-06-15T09:00:00Z",
            districts: [{ ids: [48], text: "Area text here." }],
          });
        }
        if (url.includes("coastlines")) {
          return ok({
            features: [
              {
                properties: { id: 107, name: "Sandhamn - Landsort", seaDistricts: [48] },
                geometry: { type: "Polygon", coordinates: sq },
              },
            ],
          });
        }
        return ok([]);
      })
    );
    render(<SeaReport latitude={59.5} longitude={18.5} />);
    expect(await screen.findByText("Overview sentence.")).toBeInTheDocument();
    expect(screen.getByText("Sandhamn - Landsort")).toBeInTheDocument();
    expect(screen.getByText("Area text here.")).toBeInTheDocument();
    expect(screen.getByText(/Source: SMHI/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Sea report/ })).toBeInTheDocument();
  });

  it("renders nothing when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("down"))));
    const { container } = render(<SeaReport latitude={59.5} longitude={18.5} />);
    await vi.waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
