import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/smhiProvider", () => ({
  getNearestStations: vi.fn(),
}));

import * as smhiProvider from "../../src/services/smhiProvider";
import { useGeolocation } from "../../src/hooks/useGeolocation";

function mockGeolocation(
  behavior: "success" | "denied" | "unavailable",
  coords = { latitude: 59.33, longitude: 18.06 }
) {
  const getCurrentPosition = vi.fn(
    (
      success: PositionCallback,
      error?: PositionErrorCallback
    ) => {
      if (behavior === "success") {
        success({
          coords: { ...coords, accuracy: 1 },
        } as GeolocationPosition);
      } else if (error) {
        error({
          code: behavior === "denied" ? 1 : 2,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: "",
        } as GeolocationPositionError);
      }
    }
  );
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
}

function station(id: string, displayName: string) {
  return { id, displayName, distanceKm: 1, latitude: 1, longitude: 1 };
}

describe("useGeolocation (005-add-weather-forecast: station naming)", () => {
  beforeEach(() => {
    vi.mocked(smhiProvider.getNearestStations).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves displayName to the nearest station's name after request() succeeds", async () => {
    mockGeolocation("success");
    vi.mocked(smhiProvider.getNearestStations).mockResolvedValue([station("1", "Bromma")]);

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    expect(result.current.status).toBe("granted");
    await waitFor(() => expect(result.current.location?.displayName).toBe("Bromma"));
  });

  it("falls back to 'Unnamed station' when the lookup finds no stations", async () => {
    mockGeolocation("success");
    vi.mocked(smhiProvider.getNearestStations).mockResolvedValue([]);

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    await waitFor(() => expect(result.current.location).not.toBeNull());
    // No update was applied — placeholder value persists.
    expect(result.current.location?.displayName).toBe("Unnamed station");
  });

  it("falls back to 'Unnamed station' when the lookup fails, without blocking the location", async () => {
    mockGeolocation("success");
    vi.mocked(smhiProvider.getNearestStations).mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    expect(result.current.status).toBe("granted");
    await waitFor(() => expect(result.current.location).not.toBeNull());
    expect(result.current.location?.displayName).toBe("Unnamed station");
  });

  it("status still transitions idle -> loading -> granted, unaffected by naming resolution", async () => {
    mockGeolocation("success");
    vi.mocked(smhiProvider.getNearestStations).mockResolvedValue([station("1", "Bromma")]);

    const { result } = renderHook(() => useGeolocation());
    expect(result.current.status).toBe("idle");

    act(() => result.current.request());
    expect(result.current.status).toBe("granted");

    await waitFor(() => expect(result.current.location?.displayName).toBe("Bromma"));
  });

  it("status transitions to denied when permission is denied, and no naming lookup is attempted", async () => {
    mockGeolocation("denied");

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    expect(result.current.status).toBe("denied");
    expect(smhiProvider.getNearestStations).not.toHaveBeenCalled();
  });
});
