import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Location, ObservationSeries } from "../../src/models/types";

vi.mock("../../src/services/weatherApi", () => ({
  getObservations: vi.fn(),
  getNearbyStationSeries: vi.fn(),
  getMultiSourceForecast: vi.fn(),
  getUvRisk: vi.fn(),
  getWarningsForLocation: vi.fn(),
}));

import {
  getMultiSourceForecast,
  getNearbyStationSeries,
  getObservations,
  getUvRisk,
  getWarningsForLocation,
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

const PARIS: Location = {
  latitude: 48.85,
  longitude: 2.35,
  displayName: "Paris",
  source: "favorite",
};

/** A promise that never resolves on its own — used to hold a fetch "in flight" so a test can
 *  inspect the hook's state mid-fetch, then resolve it explicitly when ready. */
function pendingPromise<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useObservationData preserves data across a window-only change (042-preserve-scroll-on-window-change, US1)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getMultiSourceForecast).mockReset();
    vi.mocked(getMultiSourceForecast).mockResolvedValue([]);
    vi.mocked(getUvRisk).mockReset();
    vi.mocked(getUvRisk).mockResolvedValue(new Set());
    vi.mocked(getWarningsForLocation).mockReset();
    vi.mocked(getWarningsForLocation).mockResolvedValue([]);
  });

  it("keeps the previous series/weeklySeries (never null) while a window-only refetch is pending", async () => {
    vi.mocked(getObservations).mockResolvedValue(series());

    const { result, rerender } = renderHook(
      ({ window }: { window: "last-24-hours" | "last-7-days" }) =>
        useObservationData(STOCKHOLM, window, 0, false),
      { initialProps: { window: "last-24-hours" as "last-24-hours" | "last-7-days" } }
    );

    await waitFor(() => expect(result.current.series).not.toBeNull());
    const initialSeries = result.current.series;
    const initialWeeklySeries = result.current.weeklySeries;

    const pending = pendingPromise<ObservationSeries>();
    vi.mocked(getObservations).mockReturnValue(pending.promise);

    rerender({ window: "last-7-days" });

    // The new fetch is now in flight (getObservations returns a still-pending promise) — the
    // hook must still be showing the previous window's data, not null, and must report
    // isRefreshing.
    expect(result.current.series).toBe(initialSeries);
    expect(result.current.weeklySeries).toBe(initialWeeklySeries);
    expect(result.current.isRefreshing).toBe(true);

    pending.resolve(series());

    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    expect(result.current.series).not.toBeNull();
  });

  it("resets series/weeklySeries to null while the new fetch is pending when the location changes", async () => {
    vi.mocked(getObservations).mockResolvedValue(series());

    const { result, rerender } = renderHook(
      ({ location }: { location: Location }) => useObservationData(location, "last-24-hours", 0, false),
      { initialProps: { location: STOCKHOLM } }
    );

    await waitFor(() => expect(result.current.series).not.toBeNull());

    const pending = pendingPromise<ObservationSeries>();
    vi.mocked(getObservations).mockReturnValue(pending.promise);

    rerender({ location: PARIS });

    // A genuine location change is a fresh start — showing Stockholm's stale data while Paris's
    // is loading would be actively wrong, so this must still reset to null (unlike the
    // window-only case above).
    expect(result.current.series).toBeNull();
    expect(result.current.isRefreshing).toBe(false);

    pending.resolve(series());
    await waitFor(() => expect(result.current.series).not.toBeNull());
  });

  it("never sets isRefreshing during the very first load for a location", async () => {
    const pending = pendingPromise<ObservationSeries>();
    vi.mocked(getObservations).mockReturnValue(pending.promise);

    const { result } = renderHook(() => useObservationData(STOCKHOLM, "last-24-hours", 0, false));

    expect(result.current.series).toBeNull();
    expect(result.current.isRefreshing).toBe(false);

    pending.resolve(series());
    await waitFor(() => expect(result.current.series).not.toBeNull());
    expect(result.current.isRefreshing).toBe(false);
  });
});

describe("useObservationData nearby-station lazy fetch (025-reduce-api-requests, US1)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue(series());
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getMultiSourceForecast).mockReset();
    vi.mocked(getMultiSourceForecast).mockResolvedValue([]);
    vi.mocked(getUvRisk).mockReset();
    vi.mocked(getUvRisk).mockResolvedValue(new Set());
    vi.mocked(getWarningsForLocation).mockReset();
    vi.mocked(getWarningsForLocation).mockResolvedValue([]);
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

describe("useObservationData UV risk fetch isolation (027-uv-index-alert)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue(series());
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getMultiSourceForecast).mockReset();
    vi.mocked(getMultiSourceForecast).mockResolvedValue([]);
    vi.mocked(getUvRisk).mockReset();
    vi.mocked(getWarningsForLocation).mockReset();
    vi.mocked(getWarningsForLocation).mockResolvedValue([]);
  });

  it("resolves series/weeklySeries without waiting on a still-pending UV fetch", async () => {
    // getUvRisk (per its own contract, never-throwing) is left pending indefinitely here — the
    // primary/weekly fetch must resolve regardless, confirming the two effects are independent.
    vi.mocked(getUvRisk).mockReturnValue(new Promise<Set<number>>(() => {}));

    const { result } = renderHook(() => useObservationData(STOCKHOLM, "last-24-hours", 0, false));

    await waitFor(() => expect(result.current.series).not.toBeNull());
    expect(result.current.weeklySeries).not.toBeNull();
    expect(result.current.uvRiskHours.size).toBe(0);
  });

  it("exposes the resolved risky hours once the UV fetch succeeds", async () => {
    const risky = new Set([123456]);
    vi.mocked(getUvRisk).mockResolvedValue(risky);

    const { result } = renderHook(() => useObservationData(STOCKHOLM, "last-24-hours", 0, false));

    await waitFor(() => expect(result.current.uvRiskHours).toBe(risky));
  });
});

describe("useObservationData warnings fetch isolation (028-severe-weather-warnings)", () => {
  beforeEach(() => {
    vi.mocked(getObservations).mockReset();
    vi.mocked(getObservations).mockResolvedValue(series());
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
    vi.mocked(getMultiSourceForecast).mockReset();
    vi.mocked(getMultiSourceForecast).mockResolvedValue([]);
    vi.mocked(getUvRisk).mockReset();
    vi.mocked(getUvRisk).mockResolvedValue(new Set());
    vi.mocked(getWarningsForLocation).mockReset();
  });

  it("resolves series/weeklySeries without waiting on a still-pending warnings fetch", async () => {
    vi.mocked(getWarningsForLocation).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useObservationData(STOCKHOLM, "last-24-hours", 0, false));

    await waitFor(() => expect(result.current.series).not.toBeNull());
    expect(result.current.weeklySeries).not.toBeNull();
    expect(result.current.warnings).toEqual([]);
  });

  it("does not re-fetch warnings when only the window changes", async () => {
    vi.mocked(getWarningsForLocation).mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ window }: { window: "last-24-hours" | "last-7-days" }) =>
        useObservationData(STOCKHOLM, window, 0, false),
      { initialProps: { window: "last-24-hours" } }
    );

    await waitFor(() => expect(getWarningsForLocation).toHaveBeenCalledTimes(1));

    rerender({ window: "last-7-days" });

    await waitFor(() => expect(getObservations).toHaveBeenCalledWith(STOCKHOLM, "last-7-days"));
    expect(getWarningsForLocation).toHaveBeenCalledTimes(1);
  });
});
