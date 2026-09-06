import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/smhiProvider", () => ({
  getNearestStations: vi.fn(),
}));

vi.mock("../../src/services/geocoding", () => ({
  reverseGeocode: vi.fn(),
}));

import * as smhiProvider from "../../src/services/smhiProvider";
import * as geocoding from "../../src/services/geocoding";
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

describe("useGeolocation (032-dashboard-polish-round-seven, US2: place name preferred)", () => {
  beforeEach(() => {
    vi.mocked(smhiProvider.getNearestStations).mockReset();
    vi.mocked(geocoding.reverseGeocode).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers a resolved place name over a resolved station name", async () => {
    mockGeolocation("success");
    vi.mocked(smhiProvider.getNearestStations).mockResolvedValue([station("1", "Uppsala Aut")]);
    vi.mocked(geocoding.reverseGeocode).mockResolvedValue("Uppsala");

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    expect(result.current.status).toBe("granted");
    await waitFor(() => expect(result.current.location?.displayName).toBe("Uppsala"));
  });

  it("falls back to the station name when reverse geocoding fails", async () => {
    mockGeolocation("success");
    vi.mocked(smhiProvider.getNearestStations).mockResolvedValue([station("1", "Bromma")]);
    vi.mocked(geocoding.reverseGeocode).mockResolvedValue(null);

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    await waitFor(() => expect(result.current.location?.displayName).toBe("Bromma"));
  });

  it("falls back to the station name when reverse geocoding rejects", async () => {
    mockGeolocation("success");
    vi.mocked(smhiProvider.getNearestStations).mockResolvedValue([station("1", "Bromma")]);
    vi.mocked(geocoding.reverseGeocode).mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    await waitFor(() => expect(result.current.location?.displayName).toBe("Bromma"));
  });

  it("falls back to 'Unnamed station' when both the place name and station name are unavailable", async () => {
    mockGeolocation("success");
    vi.mocked(smhiProvider.getNearestStations).mockResolvedValue([]);
    vi.mocked(geocoding.reverseGeocode).mockResolvedValue(null);

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    await waitFor(() => expect(result.current.location).not.toBeNull());
    expect(result.current.location?.displayName).toBe("Unnamed station");
  });

  it("falls back to 'Unnamed station' when the station lookup fails and there's no place name", async () => {
    mockGeolocation("success");
    vi.mocked(smhiProvider.getNearestStations).mockRejectedValue(new Error("network down"));
    vi.mocked(geocoding.reverseGeocode).mockResolvedValue(null);

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    expect(result.current.status).toBe("granted");
    await waitFor(() => expect(result.current.location).not.toBeNull());
    expect(result.current.location?.displayName).toBe("Unnamed station");
  });

  it("uses the place name even when the station lookup fails outright", async () => {
    mockGeolocation("success");
    vi.mocked(smhiProvider.getNearestStations).mockRejectedValue(new Error("network down"));
    vi.mocked(geocoding.reverseGeocode).mockResolvedValue("Uppsala");

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    await waitFor(() => expect(result.current.location?.displayName).toBe("Uppsala"));
  });

  it("status still transitions idle -> loading -> granted, unaffected by naming resolution", async () => {
    mockGeolocation("success");
    vi.mocked(smhiProvider.getNearestStations).mockResolvedValue([station("1", "Bromma")]);
    vi.mocked(geocoding.reverseGeocode).mockResolvedValue(null);

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
    expect(geocoding.reverseGeocode).not.toHaveBeenCalled();
  });
});
