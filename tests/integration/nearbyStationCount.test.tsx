import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NearbyStationCountControl from "../../src/components/NearbyStationCountControl";
import { useNearbyStationCountPreference } from "../../src/hooks/useNearbyStationCountPreference";
import { useObservationData } from "../../src/hooks/useObservationData";
import type { Location } from "../../src/models/types";

vi.mock("../../src/services/weatherApi", () => ({
  getObservations: vi.fn(),
  getNearbyStationSeries: vi.fn(),
}));

import { getNearbyStationSeries, getObservations } from "../../src/services/weatherApi";

const stockholm: Location = {
  latitude: 59.33,
  longitude: 18.06,
  displayName: "Stockholm",
  source: "favorite",
};

function Harness({ location }: { location: Location }) {
  const { count, setCount } = useNearbyStationCountPreference();
  useObservationData(location, "last-24-hours", count);
  return <NearbyStationCountControl count={count} onChange={setCount} />;
}

describe("Nearby station count preference (User Story 4)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getObservations).mockReset();
    vi.mocked(getNearbyStationSeries).mockReset();
    vi.mocked(getObservations).mockResolvedValue({
      location: stockholm,
      window: "last-24-hours",
      observations: [],
      status: "ready",
    });
    vi.mocked(getNearbyStationSeries).mockResolvedValue([]);
  });

  it("defaults to 4 and fetches with count 4", async () => {
    render(<Harness location={stockholm} />);

    expect(screen.getByRole("combobox")).toHaveValue("4");
    await waitFor(() =>
      expect(getNearbyStationSeries).toHaveBeenCalledWith(stockholm, "last-24-hours", 4)
    );
  });

  it("selecting a new value re-fetches with that count", async () => {
    render(<Harness location={stockholm} />);
    await waitFor(() => expect(getNearbyStationSeries).toHaveBeenCalled());

    await userEvent.setup().selectOptions(screen.getByRole("combobox"), "2");

    await waitFor(() =>
      expect(getNearbyStationSeries).toHaveBeenCalledWith(stockholm, "last-24-hours", 2)
    );
  });

  it("selecting 0 fetches with count 0 (no comparison stations)", async () => {
    render(<Harness location={stockholm} />);
    await waitFor(() => expect(getNearbyStationSeries).toHaveBeenCalled());

    await userEvent.setup().selectOptions(screen.getByRole("combobox"), "0");

    await waitFor(() =>
      expect(getNearbyStationSeries).toHaveBeenCalledWith(stockholm, "last-24-hours", 0)
    );
  });

  it("persists the chosen count across a fresh render (reload)", async () => {
    const { unmount } = render(<Harness location={stockholm} />);
    await waitFor(() => expect(getNearbyStationSeries).toHaveBeenCalled());
    await userEvent.setup().selectOptions(screen.getByRole("combobox"), "1");
    await waitFor(() =>
      expect(getNearbyStationSeries).toHaveBeenCalledWith(stockholm, "last-24-hours", 1)
    );
    unmount();

    render(<Harness location={stockholm} />);
    expect(screen.getByRole("combobox")).toHaveValue("1");
  });
});
