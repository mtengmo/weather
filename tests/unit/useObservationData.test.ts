import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Location, ObservationSeries } from "../../src/models/types";

vi.mock("../../src/services/weatherApi", () => ({
  getObservations: vi.fn(),
  getNearbyStationSeries: vi.fn(),
  getMultiSourceForecast: vi.fn(),
}));

import {
  getMultiSourceForecast,
  getNearbyStationSeries,
  getObservations,
} from "../../src/services/weatherApi";
import { useObservationData } from "../../src/hooks/useObservationData";

const STOCKHOLM: Location = {
  latitude: 59.33,
  longitude: 18.06,
  displayName: "Stockholm",
  source: "favorite",
};

function series(): ObservationSeries {
  return {
    location: STOCKHOLM,
    window: "last-24-hours",
    observations: [],
    status: "ready",
  };
}

describe("useObservationData nearby-station lazy fetch (025-reduce-api-requests, US1)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue(series());
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getMultiSourceForecast).mockReset();
    vi.mocked(getMultiSourceForecast).mockResolvedValue([]);
  });

  it("never calls getNearbyStationSeries when includeNearbyStations is false", async () => {
    const { result } = renderHook(() =>
      useObservationData(STOCKHOLM, "last-24-hours", 4, false)
    );

    await waitFor(() => expect(result.current.series).not.toBeNull());

    expect(getNearbyStationSeries).not.toHaveBeenCalled();
    expect(result.current.nearbyStations).toEqual([]);
  });

  it("calls getNearbyStationSeries when includeNearbyStations is true", async () => {
    const { result } = renderHook(() =>
      useObservationData(STOCKHOLM, "last-24-hours", 4, true)
    );

    await waitFor(() => expect(getNearbyStationSeries).toHaveBeenCalledWith(STOCKHOLM, "last-24-hours", 4));
    await waitFor(() => expect(result.current.series).not.toBeNull());
  });

  it("fetches nearby stations once includeNearbyStations flips true, without re-fetching primary/multi-source data", async () => {
    const { result, rerender } = renderHook(
      ({ include }: { include: boolean }) => useObservationData(STOCKHOLM, "last-24-hours", 4, include),
      { initialProps: { include: false } }
    );

    await waitFor(() => expect(result.current.series).not.toBeNull());
    expect(getNearbyStationSeries).not.toHaveBeenCalled();
    // Primary ("last-24-hours") + weekly ("last-7-days") — window !== "last-7-days" here.
    const observationsCallCountBefore = vi.mocked(getObservations).mock.calls.length;
    expect(observationsCallCountBefore).toBe(2);
    expect(getMultiSourceForecast).toHaveBeenCalledTimes(1);

    rerender({ include: true });

    await waitFor(() => expect(getNearbyStationSeries).toHaveBeenCalledTimes(1));
    // Flipping the flag must not re-trigger the primary/weekly/multi-source fetch for the same
    // location/window.
    expect(getObservations).toHaveBeenCalledTimes(observationsCallCountBefore);
    expect(getMultiSourceForecast).toHaveBeenCalledTimes(1);
  });
});
